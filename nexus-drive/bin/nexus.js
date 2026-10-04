#!/usr/bin/env node

const { program } = require('commander');
const { startServer } = require('../server');
const { authorize } = require('../drive-auth');

program
  .name('nexus')
  .description('Herramienta CLI para NexusDrive: Base de datos Inmortal 24/7')
  .version('1.0.0');

program.command('init')
  .description('Inicializa la conexión con Google Drive')
  .action(async () => {
    console.log('🔗 Conectando con Google Drive...');
    try {
      await authorize();
      console.log('✅ ¡NexusDrive está configurado y autorizado exitosamente!');
    } catch (err) {
      console.error('❌ Hubo un error en la autorización:', err.message);
    }
  });

program.command('start')
  .description('Inicia el servidor inmortal (Backend) y prepara todo para recibir conexiones')
  .action(() => {
    startServer();
  });

program.parse(process.argv);
