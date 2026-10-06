const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const os = require('os');

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata'];
const CONFIG_DIR = path.join(os.homedir(), '.nexus-drive');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');
const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json');

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (err) {}
}

async function loadSavedCredentialsIfExist() {
  if (process.env.GOOGLE_TOKEN) {
    try {
      return google.auth.fromJSON(JSON.parse(process.env.GOOGLE_TOKEN));
    } catch (e) {
      console.error("Error parsing GOOGLE_TOKEN", e);
    }
  }

  try {
    const content = await fs.readFile(TOKEN_PATH);
    return google.auth.fromJSON(JSON.parse(content));
  } catch (err) {
    return null;
  }
}

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

async function authorize() {
  await ensureConfigDir();
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;

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

async function initDriveApi() {
  const authClient = await authorize();
  return google.drive({version: 'v3', auth: authClient});
}

/**
 * Encuentra o crea una carpeta para una base de datos.
 */
async function getOrCreateDatabaseFolder(drive, dbName) {
  const folderName = `Nexus_DB_${dbName}`;
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create folder
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  console.log(`📁 Creada nueva carpeta de base de datos en Drive: ${folderName}`);
  return folder.data.id;
}

/**
 * Busca un archivo dentro de una carpeta específica.
 */
async function findFileInFolder(drive, fileName, folderId) {
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return res.data.files.length > 0 ? res.data.files[0].id : null;
}

/**
 * Sube o actualiza la colección en Drive dentro de su base de datos.
 */
async function syncCollectionToDrive(dbName, collectionName, data) {
  try {
    const drive = await initDriveApi();
    const folderId = await getOrCreateDatabaseFolder(drive, dbName);
    const fileName = `${collectionName}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(fileContent);
    stream.push(null);

    const media = {
      mimeType: 'application/json',
      body: stream,
    };

    const existingFileId = await findFileInFolder(drive, fileName, folderId);

    if (existingFileId) {
      await drive.files.update({
        fileId: existingFileId,
        media: media,
      });
      console.log(`✅ [Drive Sync] Colección '${dbName}/${collectionName}' actualizada.`);
    } else {
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
        },
        media: media,
        fields: 'id',
      });
      console.log(`✨ [Drive Sync] Nueva colección '${dbName}/${collectionName}' creada.`);
    }
  } catch (error) {
    console.error(`❌ [Drive Error] Fallo la sincronización de ${dbName}/${collectionName}:`, error.message);
  }
}

/**
 * Restaura TODAS las bases de datos desde Google Drive a la memoria.
 * Retorna: { dbName1: { col1: [], col2: [] }, dbName2: { ... } }
 */
async function restoreDatabaseFromDrive() {
  const drive = await initDriveApi();
  console.log(`📥 [VFS] Escaneando Drive en busca de bases de datos existentes (carpetas Nexus_DB_*)...`);
  
  // Buscar carpetas de bases de datos
  const resFolders = await drive.files.list({
    q: `name contains 'Nexus_DB_' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const databases = {};

  if (resFolders.data.files.length === 0) {
    console.log(`📥 [VFS] No se encontraron bases de datos en Drive. Empezando de cero.`);
    return databases;
  }

  for (const folder of resFolders.data.files) {
    const dbName = folder.name.replace('Nexus_DB_', '');
    databases[dbName] = {};

    // Buscar archivos .json dentro de la carpeta
    const resFiles = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType='application/json' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    for (const file of resFiles.data.files) {
      const colName = file.name.replace('.json', '');
      try {
        const result = await drive.files.get({
          fileId: file.id,
          alt: 'media'
        }, { responseType: 'json' });

        databases[dbName][colName] = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        console.log(`✅ [VFS] Colección restaurada: '${dbName}/${colName}' (${databases[dbName][colName].length} registros)`);
      } catch (e) {
        console.error(`❌ [VFS] Error al descargar '${dbName}/${colName}':`, e.message);
      }
    }
  }

  return databases;
}

async function getDriveStorageInfo() {
  try {
    const drive = await initDriveApi();
    const res = await drive.about.get({ fields: 'storageQuota,user' });
    return {
      user: res.data.user.displayName,
      email: res.data.user.emailAddress,
      storageQuota: res.data.storageQuota
    };
  } catch (e) {
    return null;
  }
}

async function deleteCollectionFromDrive(dbName, collectionName) {
  try {
    const drive = await initDriveApi();
    const folderId = await getOrCreateDatabaseFolder(drive, dbName);
    const fileName = `${collectionName}.json`;
    const fileId = await findFileInFolder(drive, fileName, folderId);
    if (fileId) {
      await drive.files.delete({ fileId });
      console.log(`🗑️ [Drive] Colección '${dbName}/${collectionName}' eliminada.`);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function listDriveDatabaseFiles() {
  try {
    const drive = await initDriveApi();
    const res = await drive.files.list({
      q: `name contains 'Nexus_DB_' and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink)',
      spaces: 'drive',
    });
    return res.data.files || [];
  } catch (e) {
    return [];
  }
}

module.exports = {
  authorize,
  syncCollectionToDrive,
  restoreDatabaseFromDrive,
  getDriveStorageInfo,
  deleteCollectionFromDrive,
  listDriveDatabaseFiles
};
