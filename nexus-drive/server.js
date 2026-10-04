const express = require('express');
const cors = require('cors');
const path = require('path');
const { 
  syncCollectionToDrive, 
  authorize, 
  restoreDatabaseFromDrive, 
  getDriveStorageInfo,
  deleteCollectionFromDrive,
  listDriveDatabaseFiles
} = require('./drive-auth');

const app = express();
const PORT = process.env.PORT || 3000;
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

// Middleware de Observabilidad (mide latencia y registra operaciones)
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const durationMs = Date.now() - start;
    if (req.path.startsWith('/db') || req.path.startsWith('/api')) {
      const match = req.path.match(/^\/db\/([a-zA-Z0-9_-]+)/);
      const collection = match ? match[1] : null;
      pushAuditLog({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
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

// Desactivar caché agresivo del navegador para que siempre lea el HTML más reciente
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

// Evitar que archivos faltantes del frontend devuelvan el index.html (Causa el error MIME)
app.use('/assets', (req, res) => {
  res.status(404).send('Asset no encontrado');
});

// Middleware de Seguridad (Solo aplicará a rutas protegidas)
const requireAuth = (req, res, next) => {
  const password = process.env.NEXUS_PASSWORD;
  if (!password) return next(); // Acceso libre si no hay clave

  // Excluir rutas públicas explícitamente
  if (req.path === '/health' || req.path === '/api/auth/status') return next();

  const apiKey = req.headers['x-api-key'];
  if (apiKey === password) {
    return next();
  }

  res.status(401).json({ error: 'Acceso Denegado: Contraseña inválida.' });
};

// Aplicar seguridad a las APIs operacionales
app.use('/api/config', requireAuth);
app.use('/api/storage', requireAuth);
app.use('/api/telemetry', requireAuth);
app.use('/api/collections', requireAuth);
app.use('/api/backup', requireAuth);
app.use('/api/restore', requireAuth);
app.use('/api/sync', requireAuth);
app.use('/db', requireAuth);

// El Motor Local (Memoria RAM VFS)
let memoryStore = {
  status: "starting",
  collections: {}
};

app.get('/health', (req, res) => {
  res.json({ 
    status: memoryStore.status, 
    uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
    message: 'NexusDrive Enterprise Engine is operational' 
  });
});

// Telemetría & Observabilidad en Tiempo Real
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

// Storage Drive Info & Cloud Files
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
  const totalCollections = Object.keys(memoryStore.collections).length;
  const totalRecords = Object.values(memoryStore.collections).reduce((acc, col) => acc + (Array.isArray(col) ? col.length : 0), 0);
  res.json({ 
    port: PORT, 
    status: memoryStore.status, 
    totalCollections, 
    totalRecords,
    isProtected: !!process.env.NEXUS_PASSWORD
  });
});

// Creación de Colecciones
app.post('/api/collections', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Nombre de colección inválido.' });
  }
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (memoryStore.collections[cleanName]) {
    return res.status(409).json({ error: `La colección '${cleanName}' ya existe.` });
  }

  memoryStore.collections[cleanName] = [];
  await syncCollectionToDrive(cleanName, []);
  res.status(201).json({ message: `Colección '${cleanName}' creada exitosamente.`, collection: cleanName });
});

// Eliminación / Drop de Colección (Borra de RAM y de Google Drive)
app.delete('/api/collections/:name', async (req, res) => {
  const col = req.params.name;
  if (!memoryStore.collections[col]) {
    return res.status(404).json({ error: `Colección '${col}' no encontrada.` });
  }

  delete memoryStore.collections[col];
  const driveDeleted = await deleteCollectionFromDrive(col);

  res.json({ 
    message: `Colección '${col}' eliminada de la memoria y ${driveDeleted ? 'de Google Drive' : 'no existía en Drive'}.`,
    collection: col,
    driveDeleted 
  });
});

// Renombrar Colección
app.post('/api/collections/:name/rename', async (req, res) => {
  const oldName = req.params.name;
  const { newName } = req.body;
  if (!newName || !memoryStore.collections[oldName]) {
    return res.status(400).json({ error: 'Parámetros inválidos o colección inexistente.' });
  }

  const cleanNewName = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const data = memoryStore.collections[oldName];
  delete memoryStore.collections[oldName];
  memoryStore.collections[cleanNewName] = data;

  await syncCollectionToDrive(cleanNewName, data);
  await deleteCollectionFromDrive(oldName);

  res.json({ message: `Colección renombrada de '${oldName}' a '${cleanNewName}'.`, collection: cleanNewName });
});

// Exportar Base de Datos Completa (Snapshot Backup)
app.get('/api/backup', (req, res) => {
  res.json({
    version: "1.1.0",
    engine: "NexusDrive Enterprise",
    exportedAt: new Date().toISOString(),
    collections: memoryStore.collections
  });
});

// Restaurar Base de Datos Completa desde Backup
app.post('/api/restore', async (req, res) => {
  const { collections } = req.body;
  if (!collections || typeof collections !== 'object') {
    return res.status(400).json({ error: 'Payload de restauración inválido.' });
  }

  memoryStore.collections = collections;
  // Sincronizar todas las colecciones a Google Drive
  for (const [colName, colData] of Object.entries(collections)) {
    if (Array.isArray(colData)) {
      await syncCollectionToDrive(colName, colData);
    }
  }

  res.json({ 
    message: 'Base de datos restaurada y sincronizada en Google Drive exitosamente.',
    restoredCollections: Object.keys(collections)
  });
});

// Forzar sincronización de todas las colecciones a Drive
app.post('/api/sync/force', async (req, res) => {
  try {
    for (const [colName, colData] of Object.entries(memoryStore.collections)) {
      await syncCollectionToDrive(colName, colData);
    }
    res.json({ message: 'Sincronización forzada completada con éxito.', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Error durante la sincronización forzada.', details: err.message });
  }
});

// Listar colecciones
app.get('/db', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  const collections = Object.keys(memoryStore.collections);
  res.json({ collections });
});

// Obtener Schema Analyzer de una colección
app.get('/db/:collection/schema', (req, res) => {
  const col = req.params.collection;
  const data = memoryStore.collections[col] || [];
  
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

  res.json({ collection: col, totalRecords: data.length, fields: schemaArray });
});

// Inserción Masiva (Batch Import)
app.post('/db/:collection/batch', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });
  const col = req.params.collection;
  const records = Array.isArray(req.body) ? req.body : req.body.records;

  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Se esperaba un arreglo de objetos.' });
  }

  if (!memoryStore.collections[col]) {
    memoryStore.collections[col] = [];
  }

  const now = new Date().toISOString();
  const createdRecords = records.map((item, idx) => ({
    _id: (Date.now() + idx).toString(),
    ...item,
    _updatedAt: now
  }));

  memoryStore.collections[col].push(...createdRecords);
  syncCollectionToDrive(col, memoryStore.collections[col]);

  res.status(201).json({ 
    message: `${createdRecords.length} registros insertados masivamente y sincronizados.`,
    insertedCount: createdRecords.length
  });
});

// Obtener datos de una colección con Búsqueda, Filtro y Paginación
app.get('/db/:collection', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  
  const col = req.params.collection;
  let data = memoryStore.collections[col] || [];

  // Búsqueda de texto libre en cualquier campo
  const { search, limit, page, sort, order } = req.query;

  if (search) {
    const q = search.toLowerCase();
    data = data.filter(record => 
      JSON.stringify(record).toLowerCase().includes(q)
    );
  }

  // Ordenamiento
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

  // Paginación opcional
  if (limit) {
    const lim = parseInt(limit, 10) || 50;
    const pg = parseInt(page, 10) || 1;
    const startIdx = (pg - 1) * lim;
    const paginated = data.slice(startIdx, startIdx + lim);

    return res.json({
      collection: col,
      total: data.length,
      page: pg,
      limit: lim,
      totalPages: Math.ceil(data.length / lim) || 1,
      data: paginated
    });
  }

  res.json({ collection: col, total: data.length, data: data });
});

// Inserción individual
app.post('/db/:collection', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });

  const col = req.params.collection;
  const payload = req.body;

  if (!memoryStore.collections[col]) {
    memoryStore.collections[col] = [];
  }

  const id = Date.now().toString();
  const record = { _id: id, ...payload, _updatedAt: new Date().toISOString() };
  
  memoryStore.collections[col].push(record);

  syncCollectionToDrive(col, memoryStore.collections[col]);
  console.log(`[VFS Sync Triggered] Creando registro en Drive para la colección: ${col}`);

  res.status(201).json({ message: 'Dato guardado en caché local y sincronización a Drive iniciada', record: record });
});

// Ruta para actualizar un dato por ID (PUT)
app.put('/db/:collection/:id', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });

  const col = req.params.collection;
  const id = req.params.id;
  const payload = req.body;

  if (!memoryStore.collections[col]) {
    return res.status(404).json({ error: "Colección no encontrada." });
  }

  const index = memoryStore.collections[col].findIndex(item => item._id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Registro no encontrado." });
  }

  memoryStore.collections[col][index] = { 
    ...memoryStore.collections[col][index], 
    ...payload, 
    _id: id, 
    _updatedAt: new Date().toISOString() 
  };

  syncCollectionToDrive(col, memoryStore.collections[col]);
  console.log(`[VFS Sync Triggered] Actualizando registro en Drive para la colección: ${col}`);

  res.json({ message: 'Dato actualizado', record: memoryStore.collections[col][index] });
});

// Ruta para borrar un dato por ID (DELETE)
app.delete('/db/:collection/:id', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos." });

  const col = req.params.collection;
  const id = req.params.id;

  if (!memoryStore.collections[col]) {
    return res.status(404).json({ error: "Colección no encontrada." });
  }

  const initialLength = memoryStore.collections[col].length;
  memoryStore.collections[col] = memoryStore.collections[col].filter(item => item._id !== id);

  if (memoryStore.collections[col].length === initialLength) {
    return res.status(404).json({ error: "Registro no encontrado." });
  }

  syncCollectionToDrive(col, memoryStore.collections[col]);
  console.log(`[VFS Sync Triggered] Borrando registro en Drive para la colección: ${col}`);

  res.json({ message: 'Dato eliminado exitosamente' });
});

// Fallback para SPA (Single Page Application)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer() {
  app.listen(PORT, async () => {
    console.log(`🚀 NexusDrive Core iniciado en http://localhost:${PORT}`);
    console.log(`🔑 Comprobando conexión con Google Drive...`);
    try {
      await authorize();
      console.log(`✅ Conectado a Google Drive exitosamente. Restaurando base de datos...`);
      
      // Restaurar desde la nube
      memoryStore.collections = await restoreDatabaseFromDrive();
      memoryStore.status = "active";
      
      console.log(`✨ Servidor Inmortal listo y operando en Memoria RAM.`);
    } catch (err) {
      console.error(`❌ Error fatal al iniciar:`, err);
    }
  });
}

module.exports = { startServer };

// Iniciar servidor si se ejecuta directamente (ej. Render o node server.js)
if (require.main === module) {
  startServer();
}
