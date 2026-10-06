const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const { Server } = require('socket.io');
const { 
  syncCollectionToDrive, 
  authorize, 
  restoreDatabaseFromDrive, 
  getDriveStorageInfo,
  deleteCollectionFromDrive,
  listDriveDatabaseFiles
} = require('./drive-auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// WebSockets (Tiempo Real)
io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado:', socket.id);
  
  socket.on('subscribe', ({ database, collection }) => {
    const room = `${database}:${collection}`;
    socket.join(room);
    console.log(`📡 Cliente ${socket.id} suscrito a ${room}`);
  });

  socket.on('unsubscribe', ({ database, collection }) => {
    const room = `${database}:${collection}`;
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

function notifyClients(database, collection, action, data) {
  const room = `${database}:${collection}`;
  io.to(room).emit('onSnapshot', { database, collection, action, data, timestamp: new Date().toISOString() });
}

const SERVER_START_TIME = Date.now();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Telemetría & Registro de Auditoría en Memoria (Últimos 100 eventos)
const auditLogs = [];
let totalOperationsCount = 0;

function pushAuditLog(log) {
  totalOperationsCount++;
  auditLogs.unshift(log);
  if (auditLogs.length > 100) auditLogs.pop();
}

app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const durationMs = Date.now() - start;
    if (req.path.startsWith('/db') || req.path.startsWith('/api')) {
      const match = req.path.match(/^\/db\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
      const database = match ? match[1] : null;
      const collection = match ? match[2] : null;
      pushAuditLog({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        database,
        collection,
        ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
      });
    }
    return originalEnd.apply(this, args);
  };

  next();
});

// Endpoints públicos
app.get('/api/auth/status', (req, res) => {
  res.json({ isProtected: !!process.env.NEXUS_PASSWORD });
});

// Swagger Docs Endpoint
try {
  const swaggerDocument = yaml.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("No se pudo cargar la documentación Swagger", e);
}

// Desactivar caché agresivo del navegador
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Servir Dashboard (Frontend) libremente
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', (req, res) => res.status(404).send('Asset no encontrado'));

// Middleware de Seguridad (Solo aplicará a rutas protegidas)
const requireAuth = (req, res, next) => {
  const password = process.env.NEXUS_PASSWORD;
  if (!password) return next();

  if (req.path === '/health' || req.path === '/api/auth/status' || req.path.startsWith('/docs')) return next();

  const apiKey = req.headers['x-api-key'];
  if (apiKey === password) {
    return next();
  }

  res.status(401).json({ error: 'Acceso Denegado: Contraseña inválida.' });
};

app.use('/api/config', requireAuth);
app.use('/api/storage', requireAuth);
app.use('/api/telemetry', requireAuth);
app.use('/api', requireAuth); // Apply to /api/:database/...
app.use('/db', requireAuth);

// El Motor Local (Memoria RAM VFS) - Arquitectura Multi-Tenant
let memoryStore = {
  status: "starting",
  databases: {}
};

app.get('/health', (req, res) => {
  res.json({ 
    status: memoryStore.status, 
    uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
    message: 'NexusDrive Enterprise Engine is operational' 
  });
});

app.get('/api/telemetry', (req, res) => {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  
  res.json({
    uptime: uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    startedAt: new Date(SERVER_START_TIME).toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    totalOperations: totalOperationsCount,
    memory: {
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      externalMb: (mem.external / 1024 / 1024).toFixed(2),
    },
    auditLogs: auditLogs.slice(0, 50)
  });
});

app.get('/api/storage', async (req, res) => {
  const info = await getDriveStorageInfo();
  res.json(info);
});

app.get('/api/storage/files', async (req, res) => {
  const files = await listDriveDatabaseFiles();
  res.json({ files });
});

// Configuración general
app.get('/api/config', (req, res) => {
  const totalDatabases = Object.keys(memoryStore.databases).length;
  let totalCollections = 0;
  let totalRecords = 0;

  for (const db in memoryStore.databases) {
    totalCollections += Object.keys(memoryStore.databases[db]).length;
    for (const col in memoryStore.databases[db]) {
      totalRecords += memoryStore.databases[db][col].length;
    }
  }

  res.json({ 
    port: PORT, 
    status: memoryStore.status, 
    totalDatabases,
    totalCollections, 
    totalRecords,
    isProtected: !!process.env.NEXUS_PASSWORD
  });
});

// Listar bases de datos
app.get('/db', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  const databases = Object.keys(memoryStore.databases);
  res.json({ databases });
});

// Listar colecciones de una base de datos
app.get('/db/:database', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  const dbName = req.params.database;
  if (!memoryStore.databases[dbName]) {
    return res.status(404).json({ error: "Base de datos no encontrada." });
  }
  const collections = Object.keys(memoryStore.databases[dbName]);
  res.json({ database: dbName, collections });
});

// Creación de Colecciones
app.post('/api/:database/collections', async (req, res) => {
  const dbName = req.params.database;
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Nombre de colección inválido.' });
  }
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  
  if (!memoryStore.databases[dbName]) {
    memoryStore.databases[dbName] = {};
  }

  if (memoryStore.databases[dbName][cleanName]) {
    return res.status(409).json({ error: `La colección '${cleanName}' ya existe en '${dbName}'.` });
  }

  memoryStore.databases[dbName][cleanName] = [];
  await syncCollectionToDrive(dbName, cleanName, []);
  res.status(201).json({ message: `Colección creada exitosamente.`, database: dbName, collection: cleanName });
});

// Eliminación / Drop de Colección
app.delete('/api/:database/collections/:name', async (req, res) => {
  const dbName = req.params.database;
  const colName = req.params.name;
  
  if (!memoryStore.databases[dbName] || !memoryStore.databases[dbName][colName]) {
    return res.status(404).json({ error: `Colección no encontrada.` });
  }

  delete memoryStore.databases[dbName][colName];
  const driveDeleted = await deleteCollectionFromDrive(dbName, colName);

  res.json({ 
    message: `Colección eliminada.`,
    database: dbName,
    collection: colName,
    driveDeleted 
  });
});

// Renombrar Colección
app.post('/api/:database/collections/:name/rename', async (req, res) => {
  const dbName = req.params.database;
  const oldName = req.params.name;
  const { newName } = req.body;

  if (!newName || !memoryStore.databases[dbName] || !memoryStore.databases[dbName][oldName]) {
    return res.status(400).json({ error: 'Parámetros inválidos o colección inexistente.' });
  }

  const cleanNewName = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const data = memoryStore.databases[dbName][oldName];
  delete memoryStore.databases[dbName][oldName];
  memoryStore.databases[dbName][cleanNewName] = data;

  await syncCollectionToDrive(dbName, cleanNewName, data);
  await deleteCollectionFromDrive(dbName, oldName);

  res.json({ message: `Colección renombrada.`, database: dbName, collection: cleanNewName });
});

// Exportar Base de Datos Completa (Snapshot Backup)
app.get('/api/backup', (req, res) => {
  res.json({
    version: "2.0.0",
    engine: "NexusDrive Enterprise Multi-Tenant",
    exportedAt: new Date().toISOString(),
    databases: memoryStore.databases
  });
});

// Obtener Schema Analyzer de una colección
app.get('/db/:database/:collection/schema', (req, res) => {
  const dbName = req.params.database;
  const colName = req.params.collection;

  if (!memoryStore.databases[dbName] || !memoryStore.databases[dbName][colName]) {
    return res.json({ database: dbName, collection: colName, totalRecords: 0, fields: [] });
  }

  const data = memoryStore.databases[dbName][colName];
  
  const schema = {};
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (!schema[key]) {
        schema[key] = {
          key,
          types: new Set(),
          count: 0,
          sampleValue: item[key]
        };
      }
      schema[key].count++;
      schema[key].types.add(Array.isArray(item[key]) ? 'array' : typeof item[key]);
    });
  });

  const schemaArray = Object.values(schema).map(field => ({
    field: field.key,
    types: Array.from(field.types),
    coveragePercent: data.length > 0 ? Math.round((field.count / data.length) * 100) : 100,
    sample: field.sampleValue
  }));

  res.json({ database: dbName, collection: colName, totalRecords: data.length, fields: schemaArray });
});

// Inserción Masiva (Batch Import)
app.post('/db/:database/:collection/batch', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });
  const dbName = req.params.database;
  const colName = req.params.collection;
  const records = Array.isArray(req.body) ? req.body : req.body.records;

  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Se esperaba un arreglo de objetos.' });
  }

  if (!memoryStore.databases[dbName]) memoryStore.databases[dbName] = {};
  if (!memoryStore.databases[dbName][colName]) memoryStore.databases[dbName][colName] = [];

  const now = new Date().toISOString();
  const createdRecords = records.map((item, idx) => ({
    _id: (Date.now() + idx).toString(),
    ...item,
    _updatedAt: now
  }));

  memoryStore.databases[dbName][colName].push(...createdRecords);
  syncCollectionToDrive(dbName, colName, memoryStore.databases[dbName][colName]);
  notifyClients(dbName, colName, 'batch_insert', createdRecords);

  res.status(201).json({ 
    message: `${createdRecords.length} registros insertados masivamente.`,
    insertedCount: createdRecords.length
  });
});

// Obtener datos de una colección con Búsqueda, Filtro y Paginación
app.get('/db/:database/:collection', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  
  const dbName = req.params.database;
  const colName = req.params.collection;

  if (!memoryStore.databases[dbName]) {
      return res.json({ database: dbName, collection: colName, total: 0, data: [] });
  }

  let data = memoryStore.databases[dbName][colName] || [];

  const { search, limit, page, sort, order, ...filters } = req.query;

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(record => 
      JSON.stringify(record).toLowerCase().includes(q)
    );
  }

  if (Object.keys(filters).length > 0) {
    data = data.filter(record => {
      let isMatch = true;
      for (const [key, rawValue] of Object.entries(filters)) {
        try {
          const value = typeof rawValue === 'string' && rawValue.startsWith('{') ? JSON.parse(rawValue) : rawValue;
          
          if (typeof value === 'object' && value !== null) {
            if (value.$eq !== undefined && record[key] != value.$eq) isMatch = false;
            if (value.$ne !== undefined && record[key] == value.$ne) isMatch = false;
            if (value.$gt !== undefined && record[key] <= value.$gt) isMatch = false;
            if (value.$lt !== undefined && record[key] >= value.$lt) isMatch = false;
            if (value.$gte !== undefined && record[key] < value.$gte) isMatch = false;
            if (value.$lte !== undefined && record[key] > value.$lte) isMatch = false;
            if (value.$in && Array.isArray(value.$in) && !value.$in.includes(record[key])) isMatch = false;
          } else {
             if (record[key] != value) isMatch = false;
          }
        } catch(e) {
          if (record[key] != rawValue) isMatch = false;
        }
      }
      return isMatch;
    });
  }

  if (sort) {
    const isDesc = order === 'desc';
    data = [...data].sort((a, b) => {
      const valA = a[sort] || '';
      const valB = b[sort] || '';
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }

  if (limit) {
    const lim = parseInt(limit, 10) || 50;
    const pg = parseInt(page, 10) || 1;
    const startIdx = (pg - 1) * lim;
    const paginated = data.slice(startIdx, startIdx + lim);

    return res.json({
      database: dbName,
      collection: colName,
      total: data.length,
      page: pg,
      limit: lim,
      totalPages: Math.ceil(data.length / lim) || 1,
      data: paginated
    });
  }

  res.json({ database: dbName, collection: colName, total: data.length, data: data });
});

// Inserción individual
app.post('/db/:database/:collection', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });

  const dbName = req.params.database;
  const colName = req.params.collection;
  const payload = req.body;

  if (!memoryStore.databases[dbName]) memoryStore.databases[dbName] = {};
  if (!memoryStore.databases[dbName][colName]) memoryStore.databases[dbName][colName] = [];

  const id = Date.now().toString();
  const record = { _id: id, ...payload, _updatedAt: new Date().toISOString() };
  
  memoryStore.databases[dbName][colName].push(record);

  syncCollectionToDrive(dbName, colName, memoryStore.databases[dbName][colName]);
  notifyClients(dbName, colName, 'insert', record);

  res.status(201).json({ message: 'Dato guardado localmente y sinc en Drive iniciada', record: record });
});

// Actualizar
app.put('/db/:database/:collection/:id', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });

  const dbName = req.params.database;
  const colName = req.params.collection;
  const id = req.params.id;
  const payload = req.body;

  if (!memoryStore.databases[dbName] || !memoryStore.databases[dbName][colName]) {
    return res.status(404).json({ error: "Colección no encontrada." });
  }

  const index = memoryStore.databases[dbName][colName].findIndex(item => item._id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Registro no encontrado." });
  }

  memoryStore.databases[dbName][colName][index] = { 
    ...memoryStore.databases[dbName][colName][index], 
    ...payload, 
    _id: id, 
    _updatedAt: new Date().toISOString() 
  };

  syncCollectionToDrive(dbName, colName, memoryStore.databases[dbName][colName]);
  notifyClients(dbName, colName, 'update', memoryStore.databases[dbName][colName][index]);

  res.json({ message: 'Dato actualizado', record: memoryStore.databases[dbName][colName][index] });
});

// Borrar
app.delete('/db/:database/:collection/:id', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });

  const dbName = req.params.database;
  const colName = req.params.collection;
  const id = req.params.id;

  if (!memoryStore.databases[dbName] || !memoryStore.databases[dbName][colName]) {
    return res.status(404).json({ error: "Colección no encontrada." });
  }

  const initialLength = memoryStore.databases[dbName][colName].length;
  memoryStore.databases[dbName][colName] = memoryStore.databases[dbName][colName].filter(item => item._id !== id);

  if (memoryStore.databases[dbName][colName].length === initialLength) {
    return res.status(404).json({ error: "Registro no encontrado." });
  }

  syncCollectionToDrive(dbName, colName, memoryStore.databases[dbName][colName]);
  notifyClients(dbName, colName, 'delete', { _id: id });

  res.json({ message: 'Dato eliminado exitosamente' });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer() {
  server.listen(PORT, async () => {
    console.log(`🚀 NexusDrive Core iniciado en http://localhost:${PORT}`);
    console.log(`🔑 Comprobando conexión con Google Drive...`);
    try {
      await authorize();
      console.log(`✅ Conectado a Google Drive exitosamente. Restaurando bases de datos (Multi-Tenant)...`);
      
      memoryStore.databases = await restoreDatabaseFromDrive();
      memoryStore.status = "active";
      
      console.log(`✨ Servidor Inmortal listo y operando en Memoria RAM con múltiples bases de datos.`);
    } catch (err) {
      console.error(`❌ Error fatal al iniciar:`, err);
    }
  });
}

module.exports = { startServer };

if (require.main === module) {
  startServer();
}
