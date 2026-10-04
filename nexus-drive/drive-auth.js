const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// Si modificas estos scopes, borra el archivo token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const os = require('os');

// Usamos el directorio home del usuario para que sea una herramienta global
const CONFIG_DIR = path.join(os.homedir(), '.nexus-drive');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');
const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json');

// Asegurar que el directorio de configuración exista
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (err) {}
}

/**
 * Lee el token de acceso previamente guardado si existe.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Guarda las credenciales para futuros arranques del servidor.
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Autentica o carga el cliente.
 */
async function authorize() {
  await ensureConfigDir();
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  // Si no hay token, levanta un server local y abre el navegador para autorizar
  console.log("⚠️  Necesitamos autorización. Se abrirá una pestaña en tu navegador...");
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// Inicializar la API de Drive
async function initDriveApi() {
  const authClient = await authorize();
  return google.drive({version: 'v3', auth: authClient});
}

/**
 * Busca un archivo en Drive por nombre (y que no esté en la papelera).
 */
async function findFileByName(drive, name) {
  const res = await drive.files.list({
    q: `name='${name}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
}

/**
 * Sube o actualiza la colección en Drive.
 */
async function syncCollectionToDrive(collectionName, data) {
  try {
    const drive = await initDriveApi();
    const fileName = `nexus_db_${collectionName}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    
    // Crear un stream de memoria para el contenido
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(fileContent);
    stream.push(null);

    const media = {
      mimeType: 'application/json',
      body: stream,
    };

    // Buscar si ya existe el archivo en Drive
    const existingFileId = await findFileByName(drive, fileName);

    if (existingFileId) {
      // Actualizar archivo existente
      await drive.files.update({
        fileId: existingFileId,
        media: media,
      });
      console.log(`✅ [Drive Sync] Colección '${collectionName}' actualizada correctamente en Drive.`);
    } else {
      // Crear archivo nuevo
      await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'application/json',
        },
        media: media,
        fields: 'id',
      });
      console.log(`✨ [Drive Sync] Nueva colección '${collectionName}' creada en Drive.`);
    }
  } catch (error) {
    console.error(`❌ [Drive Error] Fallo la sincronización:`, error.message);
  }
}

/**
 * Descarga todos los archivos que empiezan con "nexus_db_" y reconstruye la memoria.
 */
async function restoreDatabaseFromDrive() {
  const drive = await initDriveApi();
  console.log(`📥 [VFS] Escaneando Drive en busca de bases de datos existentes...`);
  
  const res = await drive.files.list({
    q: `name contains 'nexus_db_' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const files = res.data.files;
  const collections = {};

  if (files.length === 0) {
    console.log(`📥 [VFS] No se encontraron colecciones en Drive. Empezando de cero.`);
    return collections;
  }

  for (const file of files) {
    // Extraer el nombre de la colección: nexus_db_clientes.json -> clientes
    const colName = file.name.replace('nexus_db_', '').replace('.json', '');
    
    try {
      const result = await drive.files.get({
        fileId: file.id,
        alt: 'media'
      }, { responseType: 'json' });

      // Si Google Drive ya nos parseó el JSON
      collections[colName] = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      console.log(`✅ [VFS] Colección restaurada: '${colName}' (${collections[colName].length} registros)`);
    } catch (e) {
      console.error(`❌ [VFS] Error al descargar la colección ${colName}:`, e.message);
    }
  }

  return collections;
}

/**
 * Obtiene información real sobre el almacenamiento de Google Drive
 */
async function getDriveStorageInfo() {
  try {
    const drive = await initDriveApi();
    const res = await drive.about.get({
      fields: 'storageQuota,user',
    });
    return {
      user: res.data.user.displayName,
      email: res.data.user.emailAddress,
      storageQuota: res.data.storageQuota
    };
  } catch (e) {
    console.error("Error obteniendo info de almacenamiento:", e.message);
    return null;
  }
}

module.exports = {
  authorize,
  syncCollectionToDrive,
  restoreDatabaseFromDrive,
  getDriveStorageInfo
};
