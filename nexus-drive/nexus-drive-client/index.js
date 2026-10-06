const axios = require('axios');
const { io } = require('socket.io-client');

class Nexus {
  constructor(config = {}) {
    this.url = config.url || 'http://localhost:3000';
    this.apiKey = config.apiKey || '';
    this.socket = io(this.url);
    
    this.api = axios.create({
      baseURL: this.url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    });

    this.socket.on('connect', () => {
      console.log('NexusClient: Conectado al servidor en tiempo real.');
    });
  }

  database(name) {
    return new Database(this, name);
  }
}

class Database {
  constructor(nexus, name) {
    this.nexus = nexus;
    this.name = name;
  }

  collection(name) {
    return new Collection(this.nexus, this.name, name);
  }
}

class Collection {
  constructor(nexus, dbName, colName) {
    this.nexus = nexus;
    this.dbName = dbName;
    this.colName = colName;
  }

  async find(query = {}) {
    try {
      const response = await this.nexus.api.get(`/db/${this.dbName}/${this.colName}`, { params: query });
      return response.data.data;
    } catch (error) {
      throw new Error(`Error en find: ${error.response?.data?.error || error.message}`);
    }
  }

  async insert(data) {
    try {
      const response = await this.nexus.api.post(`/db/${this.dbName}/${this.colName}`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Error en insert: ${error.response?.data?.error || error.message}`);
    }
  }

  async update(id, data) {
    try {
      const response = await this.nexus.api.put(`/db/${this.dbName}/${this.colName}/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Error en update: ${error.response?.data?.error || error.message}`);
    }
  }

  async delete(id) {
    try {
      const response = await this.nexus.api.delete(`/db/${this.dbName}/${this.colName}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error en delete: ${error.response?.data?.error || error.message}`);
    }
  }

  onSnapshot(callback) {
    const payload = { database: this.dbName, collection: this.colName };
    this.nexus.socket.emit('subscribe', payload);
    
    // Escuchar actualizaciones
    this.nexus.socket.on('onSnapshot', (msg) => {
      if (msg.database === this.dbName && msg.collection === this.colName) {
        callback(msg);
      }
    });

    // Retorna una función para desuscribirse
    return () => {
      this.nexus.socket.emit('unsubscribe', payload);
      this.nexus.socket.off('onSnapshot');
    };
  }
}

module.exports = { Nexus };
