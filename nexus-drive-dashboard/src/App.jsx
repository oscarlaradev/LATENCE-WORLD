import React, { useState, useEffect } from 'react';
import { Database, LayoutDashboard, Settings, HardDrive, Trash2, Edit2, Plus, CloudCog } from 'lucide-react';
import './index.css';

const API_URL = '';

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState('checking');
  
  // Data States
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState('');
  const [records, setRecords] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const [configInfo, setConfigInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState('{\n  "clave": "valor"\n}');

  useEffect(() => {
    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === 'active') {
      if (activeTab === 'colecciones') fetchCollections();
      if (activeTab === 'almacenamiento') fetchStorageInfo();
      if (activeTab === 'configuracion' || activeTab === 'dashboard') fetchConfigInfo();
    }
  }, [status, activeTab]);

  useEffect(() => {
    if (activeTab === 'colecciones' && activeCollection) {
      fetchRecords(activeCollection);
    }
  }, [activeCollection, activeTab]);

  const fetchGlobalStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      const data = await res.json();
      setStatus(data.status);
    } catch (e) {
      setStatus('offline');
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch(`${API_URL}/db`);
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
        if (data.collections.length > 0 && !activeCollection) {
          setActiveCollection(data.collections[0]);
        }
      }
    } catch (e) {}
  };

  const fetchRecords = async (col) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/db/${col}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
      }
    } catch (e) {}
    setLoading(false);
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/storage`);
      if (res.ok) {
        setStorageInfo(await res.json());
      }
    } catch (e) {}
  };

  const fetchConfigInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      if (res.ok) {
        setConfigInfo(await res.json());
      }
    } catch (e) {}
  };

  // UI Handlers
  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    await fetch(`${API_URL}/db/${activeCollection}/${id}`, { method: 'DELETE' });
    fetchRecords(activeCollection);
  };

  const handleSave = async () => {
    try {
      const parsedData = JSON.parse(formData);
      const url = isEditing 
        ? `${API_URL}/db/${activeCollection}/${currentId}`
        : `${API_URL}/db/${activeCollection}`;
        
      await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      setShowModal(false);
      fetchRecords(activeCollection);
    } catch (e) {
      alert("JSON Invalido: " + e.message);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData('{\n  "clave": "valor"\n}');
    setShowModal(true);
  };

  const openEditModal = (record) => {
    setIsEditing(true);
    setCurrentId(record._id);
    const { _id, _updatedAt, ...rest } = record;
    setFormData(JSON.stringify(rest, null, 2));
    setShowModal(true);
  };

  const createNewCollection = () => {
    const name = prompt("Nombre de la nueva colección:");
    if (name) {
      setActiveCollection(name);
      setRecords([]);
      if (!collections.includes(name)) setCollections([...collections, name]);
    }
  };

  const renderDashboard = () => (
    <div className="card">
      <h2>Resumen del Sistema</h2>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '8px', flex: 1 }}>
          <h3 style={{ color: 'var(--text-muted)' }}>Colecciones</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{configInfo?.totalCollections || 0}</p>
        </div>
        <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '8px', flex: 1 }}>
          <h3 style={{ color: 'var(--text-muted)' }}>Registros Totales</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{configInfo?.totalRecords || 0}</p>
        </div>
      </div>
    </div>
  );

  const renderColecciones = () => {
    const columns = records.length > 0 
      ? Array.from(new Set(records.flatMap(r => Object.keys(r).filter(k => k !== '_id' && k !== '_updatedAt')))) 
      : [];

    return (
      <div style={{ display: 'flex', gap: '20px' }}>
        <div className="card" style={{ width: '250px', alignSelf: 'flex-start' }}>
          <h3>Tablas</h3>
          <ul className="nav-menu" style={{ marginTop: '10px' }}>
            {collections.map(col => (
              <li 
                key={col} 
                className={`nav-item ${activeCollection === col ? 'active' : ''}`}
                onClick={() => setActiveCollection(col)}
              >
                <Database size={16} /> {col}
              </li>
            ))}
            <li className="nav-item" onClick={createNewCollection} style={{ cursor: 'pointer', color: 'var(--primary)' }}>
              <Plus size={16} /> Nueva
            </li>
          </ul>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="header" style={{ marginBottom: '20px' }}>
            <h2>{activeCollection || 'Selecciona una colección'}</h2>
            {activeCollection && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Añadir Documento
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-state">Cargando...</div>
          ) : records.length === 0 ? (
            <div className="empty-state">No hay registros.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    {columns.map(col => <th key={col}>{col}</th>)}
                    <th>Actualizado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r._id}</td>
                      {columns.map(col => (
                        <td key={col}>{typeof r[col] === 'object' ? JSON.stringify(r[col]) : r[col]?.toString()}</td>
                      ))}
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(r._updatedAt).toLocaleString()}
                      </td>
                      <td>
                        <button className="action-btn" onClick={() => openEditModal(r)}><Edit2 size={16} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(r._id)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStorage = () => {
    if (!storageInfo) return <div className="card">Cargando datos de Drive...</div>;
    const { storageQuota } = storageInfo;
    const used = parseInt(storageQuota?.usage || 0);
    const limit = parseInt(storageQuota?.limit || (15 * 1024 * 1024 * 1024)); // Default 15GB
    const percentage = ((used / limit) * 100).toFixed(2);

    return (
      <div className="card">
        <h2>Almacenamiento de Google Drive</h2>
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <p><strong>Cuenta:</strong> {storageInfo.user} ({storageInfo.email})</p>
          <div style={{ margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Espacio Utilizado</span>
              <span>{formatBytes(used)} / {formatBytes(limit)}</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary)' }}></div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
              {percentage}% ocupado
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderConfig = () => (
    <div className="card">
      <h2>Configuración del Servidor</h2>
      <div style={{ marginTop: '20px' }}>
        <p><strong>Estado del Core:</strong> {configInfo?.status}</p>
        <p><strong>Puerto HTTP:</strong> {configInfo?.port}</p>
        <p><strong>Versión:</strong> 1.0.0 (Inmortal Edition)</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="brand">
          <CloudCog className="brand-icon" size={28} />
          NexusDrive
        </div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </li>
          <li className={`nav-item ${activeTab === 'colecciones' ? 'active' : ''}`} onClick={() => setActiveTab('colecciones')}>
            <Database size={20} /> Colecciones
          </li>
          <li className={`nav-item ${activeTab === 'almacenamiento' ? 'active' : ''}`} onClick={() => setActiveTab('almacenamiento')}>
            <HardDrive size={20} /> Almacenamiento
          </li>
          <li className={`nav-item ${activeTab === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveTab('configuracion')}>
            <Settings size={20} /> Configuración
          </li>
        </ul>
      </aside>

      <main className="main-content">
        <div className="header">
          <h1>
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'colecciones' && 'Gestor de Colecciones'}
            {activeTab === 'almacenamiento' && 'Almacenamiento en Nube'}
            {activeTab === 'configuracion' && 'Configuración de Sistema'}
          </h1>
          <div className={`status-badge ${status !== 'active' ? 'offline' : ''}`}>
            {status === 'active' ? <><span style={{color: '#16a34a'}}>●</span> Conectado a Drive</> : 
             status === 'starting' ? 'Restaurando Base de Datos...' : 'Servidor Local Caído'}
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'colecciones' && renderColecciones()}
        {activeTab === 'almacenamiento' && renderStorage()}
        {activeTab === 'configuracion' && renderConfig()}
      </main>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px', 
            width: '500px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>{isEditing ? 'Editar' : 'Añadir'} Documento</h2>
            <p style={{ fontSize: '12px', color: 'gray', marginBottom: '10px' }}>JSON válido requerido:</p>
            <textarea 
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              style={{
                width: '100%', height: '200px', padding: '15px', 
                fontFamily: 'monospace', borderRadius: '8px', border: '1px solid #ccc',
                marginBottom: '20px', resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={handleSave} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
