const express = require('express');
const cors = require('cors');
const path = require('path');
const { syncCollectionToDrive, authorize, restoreDatabaseFromDrive, getDriveStorageInfo } = require('./drive-auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoints públicos
app.get('/api/auth/status', (req, res) => {
  res.json({ isProtected: !!process.env.NEXUS_PASSWORD });
});

// Servir Dashboard (Frontend) libremente
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de Seguridad (Solo aplicará a rutas protegidas)
const requireAuth = (req, res, next) => {
  const password = process.env.NEXUS_PASSWORD;
  if (!password) return next(); // Acceso libre si no hay clave

  // Excluir rutas públicas explícitamente (por si acaso)
  if (req.path === '/health' || req.path === '/api/auth/status') return next();

  const apiKey = req.headers['x-api-key'];
  if (apiKey === password) {
    return next();
  }

  res.status(401).json({ error: 'Acceso Denegado: Contraseña inválida.' });
};

// Aplicar seguridad SOLO a la base de datos y configuración
app.use('/api/config', requireAuth);
app.use('/api/storage', requireAuth);
app.use('/db', requireAuth);

// El Motor Local (Memoria Caché)
let memoryStore = {
  status: "starting",
  collections: {}
};

app.get('/health', (req, res) => {
  res.json({ status: memoryStore.status, message: 'NexusDrive Core is running' });
});

app.get('/api/storage', async (req, res) => {
  const info = await getDriveStorageInfo();
  res.json(info);
});

app.get('/api/config', (req, res) => {
  const totalCollections = Object.keys(memoryStore.collections).length;
  const totalRecords = Object.values(memoryStore.collections).reduce((acc, col) => acc + col.length, 0);
  res.json({ port: PORT, status: memoryStore.status, totalCollections, totalRecords });
});

app.get('/db', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  const collections = Object.keys(memoryStore.collections);
  res.json({ collections });
});

app.get('/db/:collection', (req, res) => {
  if (memoryStore.status !== "active") return res.status(503).json({ error: "Servidor restaurando datos, intenta en un momento." });
  
  const col = req.params.collection;
  const data = memoryStore.collections[col] || [];
  res.json({ collection: col, data: data });
});

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

  // Actualizar preservando el ID y añadiendo fecha de modificación
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
app.get('*', (req, res) => {
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
