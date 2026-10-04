import React, { useState, useEffect } from 'react';
import { Database, LayoutDashboard, Settings, HardDrive, Trash2, Edit2, Plus, CloudCog, Lock, ChevronRight } from 'lucide-react';
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
  
  // Auth State
  const [isProtected, setIsProtected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [apiKey, setApiKey] = useState(localStorage.getItem('nexus_api_key') || '');
  const [loginError, setLoginError] = useState('');

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

  // Custom Fetch to inject API Key
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (apiKey) headers['x-api-key'] = apiKey;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
      setIsAuthenticated(false);
      localStorage.removeItem('nexus_api_key');
      throw new Error('No Autorizado');
    }
    return res;
  };

  useEffect(() => {
    checkSecurity();
    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isCheckingSecurity && status === 'active' && (!isProtected || isAuthenticated)) {
      if (activeTab === 'colecciones') fetchCollections();
      if (activeTab === 'almacenamiento') fetchStorageInfo();
      if (activeTab === 'configuracion' || activeTab === 'dashboard') fetchConfigInfo();
    }
  }, [status, activeTab, isProtected, isAuthenticated, isCheckingSecurity]);

  useEffect(() => {
    if (activeTab === 'colecciones' && activeCollection && (!isProtected || isAuthenticated)) {
      fetchRecords(activeCollection);
    }
  }, [activeCollection, activeTab, isProtected, isAuthenticated]);

  const checkSecurity = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`);
      const data = await res.json();
      setIsProtected(data.isProtected);
      if (!data.isProtected) {
        setIsAuthenticated(true);
      } else if (apiKey) {
        // Test key
        try {
          await apiFetch('/api/config');
          setIsAuthenticated(true);
        } catch(e) {}
      }
    } catch (e) {}
    setIsCheckingSecurity(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/config`, { headers: { 'x-api-key': apiKey } });
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('nexus_api_key', apiKey);
      } else {
        setLoginError('Master Key incorrecta. Acceso denegado.');
      }
    } catch(e) {
      setLoginError('Error de conexión.');
    }
  };

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
      const res = await apiFetch(`/db`);
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
      const res = await apiFetch(`/db/${col}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data || []);
      }
    } catch (e) {}
    setLoading(false);
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await apiFetch(`/api/storage`);
      if (res.ok) {
        setStorageInfo(await res.json());
      }
    } catch (e) {}
  };

  const fetchConfigInfo = async () => {
    try {
      const res = await apiFetch(`/api/config`);
      if (res.ok) {
        setConfigInfo(await res.json());
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    await apiFetch(`/db/${activeCollection}/${id}`, { method: 'DELETE' });
    fetchRecords(activeCollection);
  };

  const handleSave = async () => {
    try {
      const parsedData = JSON.parse(formData);
      const url = isEditing 
        ? `/db/${activeCollection}/${currentId}`
        : `/db/${activeCollection}`;
        
      await apiFetch(url, {
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

  if (isCheckingSecurity) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: '#64748b', fontFamily: 'Syncopate, sans-serif' }}>
        INICIANDO ENTORNO SEGURO...
      </div>
    );
  }

  if (isProtected && !isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
        <form onSubmit={handleLogin} style={{ 
          background: '#121212', padding: '40px', borderRadius: '12px', 
          border: '1px solid #333', width: '400px', textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}>
          <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '48px', height: '48px', margin: '0 auto 20px auto', display: 'block' }} />
          <h2 style={{ marginBottom: '10px', fontFamily: 'Syncopate, sans-serif', fontWeight: 600, color: 'white' }}>SISTEMA PROTEGIDO</h2>
          <p style={{ color: '#888', marginBottom: '30px', fontSize: '14px' }}>
            Esta instancia de NexusDrive requiere autenticación.
          </p>
          <input 
            type="password" 
            placeholder="Introduce la Master Key" 
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{
              width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #333',
              background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: '20px',
              outline: 'none', fontSize: '16px', textAlign: 'center'
            }}
          />
          {loginError && <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '14px' }}>{loginError}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            DESBLOQUEAR <ChevronRight size={18} />
          </button>
        </form>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="card">
      <h2>Resumen del Sistema</h2>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', flex: 1 }}>
          <h3 style={{ color: 'var(--text-muted)' }}>Colecciones</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--primary)' }}>{configInfo?.totalCollections || 0}</p>
        </div>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', flex: 1 }}>
          <h3 style={{ color: 'var(--text-muted)' }}>Registros Totales</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--primary)' }}>{configInfo?.totalRecords || 0}</p>
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
            <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' }}>
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
        <p><strong>Versión:</strong> 1.0.2 (Immortal Edition)</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '28px', height: '28px' }} />
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
        {isProtected && (
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button 
              style={{ 
                width: '100%', background: 'transparent', border: '1px solid var(--border-color)', 
                color: 'var(--text-muted)', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                fontWeight: 500, transition: '0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              onClick={() => {
                localStorage.removeItem('nexus_api_key');
                setIsAuthenticated(false);
                window.location.reload();
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        )}
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
            {status === 'active' ? <><span style={{color: '#eab308'}}>●</span> Conectado a Drive</> : 
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
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'var(--surface-color)', padding: '30px', borderRadius: '12px', 
            width: '500px', maxWidth: '90%', border: '1px solid var(--border-color)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>{isEditing ? 'Editar' : 'Añadir'} Documento</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>JSON válido requerido:</p>
            <textarea 
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              style={{
                width: '100%', height: '200px', padding: '15px', 
                fontFamily: 'monospace', borderRadius: '8px', border: '1px solid var(--border-color)',
                marginBottom: '20px', resize: 'vertical', background: '#f8fafc', color: 'var(--text-main)', outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer'
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
