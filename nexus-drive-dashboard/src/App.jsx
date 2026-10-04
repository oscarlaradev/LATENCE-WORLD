import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, LayoutDashboard, Settings, HardDrive, Trash2, Edit2, Plus, 
  Lock, ChevronRight, Play, Download, Upload, RefreshCw, Search, Copy, 
  Check, Code, FileText, Terminal, Shield, Activity, Cpu, Server, 
  Eye, EyeOff, Layers, ExternalLink, AlertTriangle, ArrowUpDown, Table as TableIcon
} from 'lucide-react';

const API_URL = window.location.origin;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState('checking');
  
  // Auth State
  const [isProtected, setIsProtected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [apiKey, setApiKey] = useState(localStorage.getItem('nexus_api_key') || '');
  const [loginError, setLoginError] = useState('');
  const [showKeyInSettings, setShowKeyInSettings] = useState(false);

  // Core Data States
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState('');
  const [records, setRecords] = useState([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  const [storageInfo, setStorageInfo] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [configInfo, setConfigInfo] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(null);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [recordFormData, setRecordFormData] = useState('{\n  "clave": "valor"\n}');
  
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const [showDropModal, setShowDropModal] = useState(false);
  const [dropConfirmInput, setDropConfirmInput] = useState('');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchJsonData, setBatchJsonData] = useState('[\n  {\n    "item": 1\n  }\n]');

  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaData, setSchemaData] = useState(null);

  // API Playground State
  const [playgroundMethod, setPlaygroundMethod] = useState('GET');
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState('/db');
  const [playgroundBody, setPlaygroundBody] = useState('{\n  "nombre": "Ejemplo"\n}');
  const [playgroundResponse, setPlaygroundResponse] = useState(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundLang, setPlaygroundLang] = useState('curl'); // 'curl' | 'js' | 'python'

  // Action status message toast
  const [actionToast, setActionToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 4000);
  };

  const copyToClipboard = (text, id = 'generic') => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // API Fetch Helper con inyección de x-api-key
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { 
      'Content-Type': 'application/json',
      ...options.headers 
    };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
      setIsAuthenticated(false);
      localStorage.removeItem('nexus_api_key');
      throw new Error('No Autorizado: Clave inválida o revocada.');
    }
    return res;
  };

  // Security Check inicial
  const checkSecurity = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/status`);
      const data = await res.json();
      setIsProtected(data.isProtected);
      
      if (!data.isProtected) {
        setIsAuthenticated(true);
      } else if (apiKey) {
        try {
          await apiFetch('/api/config');
          setIsAuthenticated(true);
        } catch (e) {
          setIsAuthenticated(false);
        }
      }
    } catch (e) {
      console.error("Error comprobando estado de seguridad:", e);
    }
    setIsCheckingSecurity(false);
  };

  // Polling de Telemetría y Configuración
  const fetchTelemetry = async () => {
    try {
      const res = await apiFetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (e) {}
  };

  const fetchGlobalStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      } else {
        setStatus('error');
      }
    } catch (e) {
      setStatus('offline');
    }
  };

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/db');
      const data = await res.json();
      const cols = data.collections || [];
      setCollections(cols);
      if (cols.length > 0 && (!activeCollection || !cols.includes(activeCollection))) {
        setActiveCollection(cols[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (col) => {
    if (!col) return;
    try {
      setLoading(true);
      const queryParam = recordSearch ? `?search=${encodeURIComponent(recordSearch)}` : '';
      const res = await apiFetch(`/db/${col}${queryParam}`);
      const data = await res.json();
      setRecords(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const res = await apiFetch('/api/storage');
      const data = await res.json();
      setStorageInfo(data);

      const filesRes = await apiFetch('/api/storage/files');
      const filesData = await filesRes.json();
      setDriveFiles(filesData.files || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConfigInfo = async () => {
    try {
      const res = await apiFetch('/api/config');
      const data = await res.json();
      setConfigInfo(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Setup Lifecycle
  useEffect(() => {
    checkSecurity();
    fetchGlobalStatus();
    const interval = setInterval(() => {
      fetchGlobalStatus();
      if (isAuthenticated) fetchTelemetry();
    }, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isCheckingSecurity && status === 'active' && (!isProtected || isAuthenticated)) {
      if (activeTab === 'dashboard') {
        fetchConfigInfo();
        fetchTelemetry();
        fetchCollections();
      } else if (activeTab === 'colecciones') {
        fetchCollections();
      } else if (activeTab === 'almacenamiento') {
        fetchStorageInfo();
      } else if (activeTab === 'configuracion') {
        fetchConfigInfo();
        fetchTelemetry();
      }
    }
  }, [status, activeTab, isProtected, isAuthenticated, isCheckingSecurity]);

  useEffect(() => {
    if (activeTab === 'colecciones' && activeCollection && (!isProtected || isAuthenticated)) {
      fetchRecords(activeCollection);
    }
  }, [activeCollection, recordSearch, activeTab]);

  // Auth Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/config`, {
        headers: { 'x-api-key': apiKey }
      });
      if (res.ok) {
        localStorage.setItem('nexus_api_key', apiKey);
        setIsAuthenticated(true);
        showToast('Autenticación exitosa. Bienvenido al panel.', 'success');
      } else {
        setLoginError('Clave Master inválida. Verifica la variable NEXUS_PASSWORD.');
      }
    } catch (err) {
      setLoginError('Error conectando con el servidor.');
    }
  };

  // Record CRUD Operations
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(recordFormData);
      if (isEditingRecord) {
        await apiFetch(`/db/${activeCollection}/${currentRecordId}`, {
          method: 'PUT',
          body: JSON.stringify(parsedData)
        });
        showToast(`Registro [${currentRecordId}] actualizado.`);
      } else {
        await apiFetch(`/db/${activeCollection}`, {
          method: 'POST',
          body: JSON.stringify(parsedData)
        });
        showToast(`Nuevo registro insertado en '${activeCollection}'.`);
      }
      setShowRecordModal(false);
      fetchRecords(activeCollection);
      fetchConfigInfo();
    } catch (err) {
      alert('Error: ' + (err.message || 'JSON inválido'));
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro ID ${id}?`)) return;
    try {
      await apiFetch(`/db/${activeCollection}/${id}`, { method: 'DELETE' });
      showToast(`Registro [${id}] eliminado.`);
      fetchRecords(activeCollection);
      fetchConfigInfo();
    } catch (err) {
      alert('Error eliminando: ' + err.message);
    }
  };

  const handleDuplicateRecord = (item) => {
    const { _id, _updatedAt, ...cleanData } = item;
    setRecordFormData(JSON.stringify(cleanData, null, 2));
    setIsEditingRecord(false);
    setCurrentRecordId(null);
    setShowRecordModal(true);
  };

  // Collection Operations
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    try {
      const res = await apiFetch('/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newCollectionName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Colección '${data.collection}' creada con éxito.`);
      setNewCollectionName('');
      setShowNewCollectionModal(false);
      await fetchCollections();
      setActiveCollection(data.collection);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDropCollection = async () => {
    if (dropConfirmInput !== activeCollection) {
      alert('El nombre ingresado no coincide.');
      return;
    }
    try {
      const res = await apiFetch(`/api/collections/${activeCollection}`, { method: 'DELETE' });
      const data = await res.json();
      showToast(data.message);
      setShowDropModal(false);
      setDropConfirmInput('');
      await fetchCollections();
    } catch (err) {
      alert('Error al eliminar colección: ' + err.message);
    }
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(batchJsonData);
      const res = await apiFetch(`/db/${activeCollection}/batch`, {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setShowBatchModal(false);
      fetchRecords(activeCollection);
    } catch (err) {
      alert('Error en importación batch: ' + err.message);
    }
  };

  const handleInspectSchema = async () => {
    try {
      const res = await apiFetch(`/db/${activeCollection}/schema`);
      const data = await res.json();
      setSchemaData(data);
      setShowSchemaModal(true);
    } catch (err) {
      alert('Error analizando schema: ' + err.message);
    }
  };

  // Full Database Snapshot Backup / Restore
  const handleDownloadBackup = async () => {
    try {
      const res = await apiFetch('/api/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-drive-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Snapshot completo descargado con éxito.');
    } catch (err) {
      alert('Error al generar snapshot: ' + err.message);
    }
  };

  const handleForceSync = async () => {
    try {
      showToast('Sincronizando con Google Drive...', 'info');
      const res = await apiFetch('/api/sync/force', { method: 'POST' });
      const data = await res.json();
      showToast(data.message);
    } catch (err) {
      alert('Error sincronizando: ' + err.message);
    }
  };

  // Export Collection as JSON / CSV
  const handleExportCollection = (format) => {
    if (records.length === 0) {
      alert('La colección está vacía.');
      return;
    }
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeCollection}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } else if (format === 'csv') {
      const keys = Array.from(new Set(records.flatMap(r => Object.keys(r))));
      const csvRows = [
        keys.join(','),
        ...records.map(row => 
          keys.map(k => {
            const val = row[k] === undefined ? '' : row[k];
            return typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeCollection}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }
  };

  // API Playground Execution
  const handleExecutePlayground = async () => {
    setPlaygroundLoading(true);
    const start = performance.now();
    try {
      const options = {
        method: playgroundMethod,
        headers: { 'Content-Type': 'application/json' }
      };
      if (apiKey) options.headers['x-api-key'] = apiKey;
      if (['POST', 'PUT'].includes(playgroundMethod)) {
        options.body = playgroundBody;
      }
      const res = await fetch(`${API_URL}${playgroundEndpoint}`, options);
      const duration = (performance.now() - start).toFixed(1);
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = await res.text();
      }
      setPlaygroundResponse({
        status: res.status,
        statusText: res.statusText,
        duration,
        data
      });
    } catch (err) {
      setPlaygroundResponse({
        status: 'ERR',
        statusText: 'Network / CORS Error',
        duration: (performance.now() - start).toFixed(1),
        data: { error: err.message }
      });
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Code Snippet Generator
  const generatedCode = useMemo(() => {
    const url = `${API_URL}${playgroundEndpoint}`;
    const keyHeader = apiKey ? `-H "x-api-key: ${apiKey}"` : '';

    if (playgroundLang === 'curl') {
      let cmd = `curl -X ${playgroundMethod} "${url}" \\\n  -H "Content-Type: application/json"`;
      if (apiKey) cmd += ` \\\n  ${keyHeader}`;
      if (['POST', 'PUT'].includes(playgroundMethod)) {
        cmd += ` \\\n  -d '${playgroundBody.replace(/'/g, "'\\''")}'`;
      }
      return cmd;
    }
    if (playgroundLang === 'js') {
      const headersObj = { 'Content-Type': 'application/json' };
      if (apiKey) headersObj['x-api-key'] = apiKey;
      return `const response = await fetch("${url}", {\n  method: "${playgroundMethod}",\n  headers: ${JSON.stringify(headersObj, null, 2)},\n${['POST', 'PUT'].includes(playgroundMethod) ? `  body: JSON.stringify(${playgroundBody})\n` : ''}});\nconst data = await response.json();\nconsole.log(data);`;
    }
    if (playgroundLang === 'python') {
      return `import requests\n\nurl = "${url}"\nheaders = {\n    "Content-Type": "application/json",\n${apiKey ? `    "x-api-key": "${apiKey}",\n` : ''}}\n${['POST', 'PUT'].includes(playgroundMethod) ? `payload = ${playgroundBody}\nresponse = requests.${playgroundMethod.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${playgroundMethod.toLowerCase()}(url, headers=headers)`}\n\nprint(response.json())`;
    }
    return '';
  }, [playgroundMethod, playgroundEndpoint, playgroundBody, playgroundLang, apiKey]);

  // Dynamic table columns for Data Studio
  const tableColumns = useMemo(() => {
    if (!records || records.length === 0) return ['_id'];
    const cols = new Set(['_id']);
    records.forEach(r => Object.keys(r).forEach(k => cols.add(k)));
    return Array.from(cols);
  }, [records]);

  // RENDER CONDITIONAL: LOADING & LOGIN
  if (isCheckingSecurity) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-secondary)', gap: '16px' }}>
        <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '48px', height: '48px' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '2px', color: 'var(--accent)' }}>
          INITIALIZING NEXUS VFS ENGINE...
        </div>
      </div>
    );
  }

  if (isProtected && !isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', 
        background: 'var(--bg-color)'
      }}>
        <form onSubmit={handleLogin} style={{ 
          background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-sm)', 
          border: '1px solid var(--border)', width: '420px', textAlign: 'center',
          boxShadow: '0 25px 70px rgba(0,0,0,0.9)', position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)' }}></div>
          <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '50px', height: '50px', margin: '0 auto 18px auto', display: 'block' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            NEXUS DRIVE
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
            CONTROL PLANE // PROTECTED SYSTEM
          </p>

          <div style={{ textAlign: 'left', marginBottom: '18px' }}>
            <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Master Key / API Token
            </label>
            <input 
              type="password" 
              placeholder="NEXUS_PASSWORD" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="input-dark"
              style={{ width: '100%', marginTop: '6px', fontFamily: 'var(--font-mono)' }}
              autoFocus
            />
          </div>

          {loginError && (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '18px', fontFamily: 'var(--font-mono)' }}>
              {loginError}
            </div>
          )}

          <button type="submit" className="btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            Desbloquear Consola <ChevronRight size={16} />
          </button>
        </form>
      </div>
    );
  }

  // MAIN ENTERPRISE DASHBOARD
  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {actionToast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          background: actionToast.type === 'error' ? '#f43f5e' : '#10b981',
          color: '#fff', padding: '12px 20px', borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: 600, fontSize: '0.88rem'
        }}>
          <Check size={18} /> {actionToast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '32px', height: '32px' }} />
          <div>
            <div className="brand-text">
              NexusDrive
              <span className="brand-badge">VFS PRO</span>
            </div>
          </div>
        </div>

        <div className="nav-section-title">Navegación Principal</div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <div className="nav-item-content">
              <LayoutDashboard size={18} /> Overview
            </div>
          </li>
          <li className={`nav-item ${activeTab === 'colecciones' ? 'active' : ''}`} onClick={() => setActiveTab('colecciones')}>
            <div className="nav-item-content">
              <Database size={18} /> Data Studio
            </div>
            <span className="nav-badge">{collections.length}</span>
          </li>
          <li className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`} onClick={() => setActiveTab('playground')}>
            <div className="nav-item-content">
              <Terminal size={18} /> API Sandbox
            </div>
            <span className="nav-badge" style={{ color: 'var(--accent-cyan)' }}>REST</span>
          </li>
          <li className={`nav-item ${activeTab === 'snapshots' ? 'active' : ''}`} onClick={() => setActiveTab('snapshots')}>
            <div className="nav-item-content">
              <Layers size={18} /> Snapshots & Backup
            </div>
          </li>
          <li className={`nav-item ${activeTab === 'almacenamiento' ? 'active' : ''}`} onClick={() => setActiveTab('almacenamiento')}>
            <div className="nav-item-content">
              <HardDrive size={18} /> Cloud VFS & Drive
            </div>
          </li>
          <li className={`nav-item ${activeTab === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveTab('configuracion')}>
            <div className="nav-item-content">
              <Settings size={18} /> Diagnósticos & Seguridad
            </div>
          </li>
        </ul>

        {/* Telemetry Mini Card */}
        <div className="sidebar-footer">
          {telemetry && (
            <div className="telemetry-mini-card">
              <div className="telemetry-row">
                <span className="telemetry-label">RAM Heap:</span>
                <span className="telemetry-val">{telemetry.memory.heapUsedMb} MB</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Uptime:</span>
                <span className="telemetry-val">{telemetry.uptimeHuman}</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Operaciones:</span>
                <span className="telemetry-val">{telemetry.totalOperations}</span>
              </div>
            </div>
          )}

          {isProtected && (
            <button 
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', color: '#94a3b8' }}
              onClick={() => {
                localStorage.removeItem('nexus_api_key');
                setIsAuthenticated(false);
                window.location.reload();
              }}
            >
              <Lock size={15} /> Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="breadcrumb-area">
            <span className="breadcrumb-link">Cluster: PROD-1</span>
            <span>/</span>
            <span className="breadcrumb-link">nexus-drive</span>
            <span>/</span>
            <span className="breadcrumb-active" style={{ textTransform: 'capitalize' }}>{activeTab}</span>
          </div>

          <div className="top-bar-stats">
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleForceSync}>
              <RefreshCw size={14} /> Sincronizar Drive
            </button>
            <div className="pulse-indicator">
              <span className="pulse-dot"></span>
              {status === 'active' ? 'VFS LIVE (RAM + DRIVE)' : status.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="page-body">
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Executive Overview</h1>
                  <p className="page-subtitle">Telemetría en tiempo real del motor en memoria con persistencia en Google Drive.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={() => { fetchConfigInfo(); fetchTelemetry(); }}>
                    <RefreshCw size={16} /> Refrescar
                  </button>
                  <button className="btn-accent" onClick={() => setShowNewCollectionModal(true)}>
                    <Plus size={15} /> Nueva Colección
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-title">Colecciones Activas</span>
                    <div className="metric-icon-box" style={{ color: 'var(--accent-cyan)' }}>
                      <Database size={20} />
                    </div>
                  </div>
                  <div className="metric-value">{configInfo?.totalCollections || collections.length}</div>
                  <div className="metric-sub">
                    <span style={{ color: 'var(--accent-cyan)' }}>En RAM</span> • Sincronizadas en la nube
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-title">Registros Totales</span>
                    <div className="metric-icon-box" style={{ color: 'var(--accent-emerald)' }}>
                      <Layers size={20} />
                    </div>
                  </div>
                  <div className="metric-value">{configInfo?.totalRecords || 0}</div>
                  <div className="metric-sub">
                    <span style={{ color: 'var(--accent-emerald)' }}>Indexados</span> • Latencia sub-milisegundo
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-title">Consumo RAM Heap</span>
                    <div className="metric-icon-box" style={{ color: 'var(--primary)' }}>
                      <Cpu size={20} />
                    </div>
                  </div>
                  <div className="metric-value">{telemetry?.memory.heapUsedMb || '0.00'} <span style={{ fontSize: '1rem' }}>MB</span></div>
                  <div className="metric-sub">
                    Total RSS: {telemetry?.memory.rssMb || '0'} MB
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-top">
                    <span className="metric-card-title">Google Drive Quota</span>
                    <div className="metric-icon-box" style={{ color: 'var(--accent-amber)' }}>
                      <HardDrive size={20} />
                    </div>
                  </div>
                  <div className="metric-value">
                    {storageInfo?.storageQuota?.limit ? 
                      `${Math.round((parseInt(storageInfo.storageQuota.usage, 10) / parseInt(storageInfo.storageQuota.limit, 10)) * 100)}%` : 
                      '15 GB'}
                  </div>
                  <div className="metric-sub">
                    {storageInfo?.email || 'Nube Conectada'}
                  </div>
                </div>
              </div>

              {/* Topology Visualizer */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Server size={18} color="var(--accent-cyan)" />
                    Topología de Persistencia Híbrida (L1 Cache RAM + L2 Cloud VFS)
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-around', 
                  padding: '24px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem', border: '1px solid var(--border)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', fontWeight: 600 }}>
                      REST / Client Apps
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '6px' }}>CRUD Requests</div>
                  </div>
                  <div style={{ color: 'var(--accent)', fontWeight: 700 }}>⇄ &lt;1ms ⇄</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ padding: '12px 18px', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontWeight: 700 }}>
                      RAM VFS (L1 Cache)
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '6px' }}>In-Memory Engine</div>
                  </div>
                  <div style={{ color: 'var(--accent)', fontWeight: 700 }}>⇄ Async Sync ⇄</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', fontWeight: 600 }}>
                      Google Drive (L2 Cloud)
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '6px' }}>Permanent JSON Storage</div>
                  </div>
                </div>
              </div>

              {/* Live Audit Trail (Limitado a los 10 más recientes) */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Activity size={16} color="var(--accent)" />
                    Live Audit Trail (Últimas 10 Operaciones)
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Mostrando 10 más recientes (Total acumulado: {telemetry?.totalOperations || 0})
                  </span>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th>Path</th>
                        <th>Colección</th>
                        <th>Status</th>
                        <th>Latencia</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry?.auditLogs && telemetry.auditLogs.length > 0 ? (
                        telemetry.auditLogs.slice(0, 10).map(log => (
                          <tr key={log.id}>
                            <td>
                              <span className={`method-badge method-${log.method.toLowerCase()}`}>
                                {log.method}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#fff' }}>{log.path}</td>
                            <td>{log.collection ? <span className="type-pill">{log.collection}</span> : '-'}</td>
                            <td>
                              <span style={{ 
                                color: log.status < 300 ? 'var(--accent-emerald)' : log.status < 500 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                                fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.82rem'
                              }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{log.durationMs} ms</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            No hay actividad reciente registrada en el audit trail.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA STUDIO (COLECCIONES PRO) */}
          {activeTab === 'colecciones' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Data Studio</h1>
                  <p className="page-subtitle">Exploración granular, manipulación y análisis de schema de tus datos.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={() => handleExportCollection('json')}>
                    <Download size={15} /> Exportar JSON
                  </button>
                  <button className="btn-secondary" onClick={() => handleExportCollection('csv')}>
                    <FileText size={15} /> CSV
                  </button>
                  <button className="btn-secondary" onClick={() => setShowBatchModal(true)}>
                    <Upload size={15} /> Importar Batch
                  </button>
                  <button className="btn-accent" onClick={() => {
                    setIsEditingRecord(false);
                    setRecordFormData('{\n  "clave": "valor"\n}');
                    setShowRecordModal(true);
                  }}>
                    <Plus size={15} /> Nuevo Registro
                  </button>
                </div>
              </div>

              {/* Collections Master-Detail Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
                {/* Left Collections List */}
                <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Colecciones ({collections.length})
                    </span>
                    <button 
                      onClick={() => setShowNewCollectionModal(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                      title="Crear Nueva Colección"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {collections.map(col => (
                      <div 
                        key={col}
                        onClick={() => setActiveCollection(col)}
                        style={{
                          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: activeCollection === col ? 'var(--bg-surface-hover)' : 'transparent',
                          color: activeCollection === col ? '#fff' : 'var(--text-secondary)',
                          borderLeft: activeCollection === col ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                          fontWeight: activeCollection === col ? 600 : 500, fontSize: '0.88rem'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Database size={15} color={activeCollection === col ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                          {col}
                        </span>
                      </div>
                    ))}
                    {collections.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>
                        No hay colecciones creadas.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Records Pane */}
                <div>
                  {activeCollection ? (
                    <div className="card" style={{ padding: '20px' }}>
                      {/* Top Action Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                            {activeCollection}
                          </h2>
                          <span className="type-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe' }}>
                            {records.length} registros
                          </span>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={handleInspectSchema}
                          >
                            <Code size={13} /> Schema Analyzer
                          </button>
                        </div>

                        {/* Search & View Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              placeholder="Filtrar registros..." 
                              value={recordSearch}
                              onChange={e => setRecordSearch(e.target.value)}
                              className="input-dark"
                              style={{ paddingLeft: '32px', height: '38px', fontSize: '0.82rem', width: '220px' }}
                            />
                          </div>

                          <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                            <button 
                              onClick={() => setViewMode('table')}
                              style={{ 
                                padding: '6px 10px', background: viewMode === 'table' ? 'var(--bg-surface-hover)' : 'transparent',
                                border: 'none', color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'
                              }}
                            >
                              <TableIcon size={14} /> Tabla
                            </button>
                            <button 
                              onClick={() => setViewMode('json')}
                              style={{ 
                                padding: '6px 10px', background: viewMode === 'json' ? 'var(--bg-surface-hover)' : 'transparent',
                                border: 'none', color: viewMode === 'json' ? '#fff' : 'var(--text-muted)',
                                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'
                              }}
                            >
                              <Code size={14} /> JSON
                            </button>
                          </div>

                          <button 
                            className="btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setShowDropModal(true)}
                          >
                            <Trash2 size={14} /> Drop Colección
                          </button>
                        </div>
                      </div>

                      {/* View Content */}
                      {viewMode === 'table' ? (
                        <div className="table-wrapper">
                          <table>
                            <thead>
                              <tr>
                                {tableColumns.map(col => (
                                  <th key={col}>{col}</th>
                                ))}
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.length > 0 ? (
                                records.map(item => (
                                  <tr key={item._id}>
                                    {tableColumns.map(col => (
                                      <td key={col}>
                                        {col === '_id' ? (
                                          <span 
                                            className="type-pill" 
                                            style={{ cursor: 'pointer', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}
                                            onClick={() => copyToClipboard(item._id, item._id)}
                                            title="Click para copiar ID"
                                          >
                                            {copiedText === item._id ? 'Copiado!' : item._id}
                                          </span>
                                        ) : typeof item[col] === 'object' ? (
                                          <span className="type-pill">{JSON.stringify(item[col])}</span>
                                        ) : (
                                          String(item[col] ?? '')
                                        )}
                                      </td>
                                    ))}
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                                        <button 
                                          className="btn-secondary" 
                                          style={{ padding: '6px', borderRadius: '6px' }}
                                          onClick={() => handleDuplicateRecord(item)}
                                          title="Clonar Registro"
                                        >
                                          <Copy size={13} />
                                        </button>
                                        <button 
                                          className="btn-secondary" 
                                          style={{ padding: '6px', borderRadius: '6px' }}
                                          onClick={() => {
                                            const { _id, _updatedAt, ...rest } = item;
                                            setRecordFormData(JSON.stringify(rest, null, 2));
                                            setCurrentRecordId(_id);
                                            setIsEditingRecord(true);
                                            setShowRecordModal(true);
                                          }}
                                          title="Editar Registro"
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button 
                                          className="btn-danger" 
                                          style={{ padding: '6px', borderRadius: '6px' }}
                                          onClick={() => handleDeleteRecord(item._id)}
                                          title="Eliminar Registro"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={tableColumns.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    No hay registros en esta colección. Usa el botón "+ Nuevo Registro" para crear uno.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => copyToClipboard(JSON.stringify(records, null, 2), 'raw-json')}
                          >
                            <Copy size={13} /> {copiedText === 'raw-json' ? 'Copiado!' : 'Copiar JSON'}
                          </button>
                          <textarea 
                            readOnly 
                            className="textarea-dark"
                            style={{ height: '450px', background: '#080c16', border: '1px solid var(--border-subtle)' }}
                            value={JSON.stringify(records, null, 2)}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card empty-state">
                      <Database size={40} className="empty-state-icon" />
                      <h3>Selecciona o crea una colección</h3>
                      <p>Administra registros con persistencia automatizada en Google Drive.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API SANDBOX & PLAYGROUND */}
          {activeTab === 'playground' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">API Sandbox & Developer Playground</h1>
                  <p className="page-subtitle">Prueba endpoints en vivo, inspecciona latencias y genera código listo para producción.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Request Builder */}
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '18px' }}>
                    <Terminal size={18} color="var(--accent-cyan)" /> Request Constructor
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <select 
                      className="select-dark"
                      style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      value={playgroundMethod}
                      onChange={e => setPlaygroundMethod(e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>

                    <input 
                      type="text" 
                      className="input-dark"
                      style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      value={playgroundEndpoint}
                      onChange={e => setPlaygroundEndpoint(e.target.value)}
                      placeholder="/db o /api/config"
                    />

                    <button 
                      className="btn-accent" 
                      disabled={playgroundLoading}
                      onClick={handleExecutePlayground}
                    >
                      <Play size={15} /> {playgroundLoading ? 'Ejecutando...' : 'Ejecutar'}
                    </button>
                  </div>

                  {/* Pre-set Route Quick Jumps */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Atajos:</span>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => { setPlaygroundMethod('GET'); setPlaygroundEndpoint('/db'); }}>GET /db</button>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => { setPlaygroundMethod('GET'); setPlaygroundEndpoint('/api/telemetry'); }}>GET /api/telemetry</button>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => { setPlaygroundMethod('GET'); setPlaygroundEndpoint('/api/storage'); }}>GET /api/storage</button>
                    {activeCollection && (
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => { setPlaygroundMethod('GET'); setPlaygroundEndpoint(`/db/${activeCollection}`); }}>GET /db/{activeCollection}</button>
                    )}
                  </div>

                  {['POST', 'PUT'].includes(playgroundMethod) && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        JSON Payload
                      </label>
                      <textarea 
                        className="textarea-dark"
                        style={{ height: '180px', marginTop: '6px' }}
                        value={playgroundBody}
                        onChange={e => setPlaygroundBody(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Code Snippet Generator */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Código de Integración Generado
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['curl', 'js', 'python'].map(l => (
                          <button 
                            key={l}
                            onClick={() => setPlaygroundLang(l)}
                            style={{ 
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', border: 'none',
                              background: playgroundLang === l ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                              color: playgroundLang === l ? '#fff' : 'var(--text-muted)', cursor: 'pointer'
                            }}
                          >
                            {l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="btn-secondary"
                        style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', fontSize: '0.7rem' }}
                        onClick={() => copyToClipboard(generatedCode, 'code-gen')}
                      >
                        <Copy size={12} /> {copiedText === 'code-gen' ? 'Copiado!' : 'Copiar'}
                      </button>
                      <pre style={{ 
                        background: '#040711', padding: '14px', borderRadius: '8px', 
                        border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                        overflowX: 'auto', color: '#a5f3fc'
                      }}>
                        {generatedCode}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Response Inspector */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Code size={18} color="var(--accent-emerald)" /> Response Inspector
                    </div>
                    {playgroundResponse && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="type-pill" style={{ 
                          background: playgroundResponse.status < 300 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: playgroundResponse.status < 300 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          fontWeight: 700 
                        }}>
                          {playgroundResponse.status} {playgroundResponse.statusText}
                        </span>
                        <span className="type-pill">{playgroundResponse.duration} ms</span>
                      </div>
                    )}
                  </div>

                  {playgroundResponse ? (
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="btn-secondary"
                        style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', fontSize: '0.7rem' }}
                        onClick={() => copyToClipboard(JSON.stringify(playgroundResponse.data, null, 2), 'resp-copy')}
                      >
                        <Copy size={12} /> {copiedText === 'resp-copy' ? 'Copiado!' : 'Copiar'}
                      </button>
                      <pre style={{ 
                        background: '#040711', padding: '16px', borderRadius: '8px', 
                        border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                        height: '480px', overflowY: 'auto', color: '#e2e8f0'
                      }}>
                        {JSON.stringify(playgroundResponse.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: '120px 20px' }}>
                      <Play size={36} className="empty-state-icon" />
                      <p>Presiona "Ejecutar" para inspeccionar la respuesta en vivo.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SNAPSHOTS & DISASTER RECOVERY */}
          {activeTab === 'snapshots' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Snapshots & Disaster Recovery</h1>
                  <p className="page-subtitle">Protección contra pérdida de datos, copias de seguridad portátiles y sincronización en frío.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '14px' }}>
                    <Download size={18} color="var(--accent-cyan)" /> Exportar Snapshot Completo
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                    Descarga una copia instantánea e inmutable de toda la base de datos en formato JSON portable. Contiene todas las colecciones, registros e índices.
                  </p>
                  <button className="btn-accent" onClick={handleDownloadBackup}>
                    <Download size={15} /> Descargar Snapshot JSON
                  </button>
                </div>

                <div className="card">
                  <div className="card-title" style={{ marginBottom: '14px' }}>
                    <RefreshCw size={18} color="var(--accent-emerald)" /> Sincronización Forzada a Google Drive
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                    Fuerza la persistencia física de todas las colecciones en memoria hacia tu almacenamiento seguro en Google Drive.
                  </p>
                  <button className="btn-secondary" onClick={handleForceSync}>
                    <RefreshCw size={16} /> Sincronizar Ahora
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLOUD VFS & DRIVE */}
          {activeTab === 'almacenamiento' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Cloud VFS & Drive Storage</h1>
                  <p className="page-subtitle">Inspección directa de los archivos físicos que residen en Google Drive.</p>
                </div>
                <button className="btn-secondary" onClick={fetchStorageInfo}>
                  <RefreshCw size={16} /> Actualizar
                </button>
              </div>

              {storageInfo ? (
                <div>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-card-title">Usuario Google</div>
                      <div className="metric-value" style={{ fontSize: '1.4rem' }}>{storageInfo.user}</div>
                      <div className="metric-sub">{storageInfo.email}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-card-title">Archivos de Base de Datos</div>
                      <div className="metric-value">{driveFiles.length}</div>
                      <div className="metric-sub">Archivos nexus_db_*.json</div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title" style={{ marginBottom: '18px' }}>
                      <HardDrive size={18} color="var(--accent-cyan)" />
                      Archivos Físicos en Google Drive
                    </div>

                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Nombre Archivo</th>
                            <th>File ID</th>
                            <th>Tamaño</th>
                            <th>Última Modificación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driveFiles.length > 0 ? (
                            driveFiles.map(file => (
                              <tr key={file.id}>
                                <td style={{ color: '#fff', fontWeight: 600 }}>{file.name}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{file.id}</td>
                                <td>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : '0 KB'}</td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(file.modifiedTime).toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                No se encontraron archivos nexus_db_ en Google Drive.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card empty-state">
                  <HardDrive size={36} className="empty-state-icon" />
                  <p>Cargando información de almacenamiento de Google Drive...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DIAGNÓSTICOS & SEGURIDAD */}
          {activeTab === 'configuracion' && (
            <div>
              <div className="page-header">
                <div>
                  <h1 className="page-title">Diagnósticos & Seguridad</h1>
                  <p className="page-subtitle">Información del runtime de Node.js, configuración de llaves y auditoría de protección.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Runtime Telemetry */}
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '18px' }}>
                    <Server size={18} color="var(--accent-cyan)" /> Runtime & Host Environment
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Versión de Node.js:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{telemetry?.nodeVersion || process.version}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Plataforma / Arquitectura:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{telemetry?.platform || 'linux'} ({telemetry?.arch || 'x64'})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Puerto Operacional:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{configInfo?.port || 3000}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tiempo Activo (Uptime):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>{telemetry?.uptimeHuman || '0s'}</span>
                    </div>
                  </div>
                </div>

                {/* Security Posture */}
                <div className="card">
                  <div className="card-title" style={{ marginBottom: '18px' }}>
                    <Shield size={18} color="var(--accent-emerald)" /> Postura de Seguridad
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Tu base de datos está protegida mediante autenticación obligatoria por cabecera HTTP <code>x-api-key</code>.
                  </p>
                  
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Token Actual en Uso
                      </span>
                      <button 
                        onClick={() => setShowKeyInSettings(!showKeyInSettings)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {showKeyInSettings ? 'Ocultar' : 'Revelar'}
                      </button>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fff', wordBreak: 'break-all' }}>
                      {showKeyInSettings ? (apiKey || 'Sin contraseña configurada') : (apiKey ? '••••••••••••••••••••••••' : 'Libre')}
                    </div>
                  </div>

                  <button 
                    className="btn-secondary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => copyToClipboard(`x-api-key: ${apiKey}`, 'header-copy')}
                  >
                    <Copy size={14} /> {copiedText === 'header-copy' ? 'Cabecera Copiada!' : 'Copiar Cabecera de Autorización'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: NUEVO/EDITAR REGISTRO */}
      {showRecordModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              {isEditingRecord ? `Editar Registro [${currentRecordId}]` : `Nuevo Registro en '${activeCollection}'`}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px' }}>
              Ingresa el objeto en formato JSON válido. Los campos <code>_id</code> y <code>_updatedAt</code> se mantendrán sincronizados.
            </p>
            <form onSubmit={handleSaveRecord}>
              <textarea 
                className="textarea-dark"
                style={{ height: '220px', marginBottom: '20px' }}
                value={recordFormData}
                onChange={e => setRecordFormData(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRecordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  {isEditingRecord ? 'Actualizar' : 'Insertar en Base de Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVA COLECCIÓN */}
      {showNewCollectionModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Crear Nueva Colección
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px' }}>
              Las colecciones se crean en RAM inmediatamente y se asocian a un archivo JSON seguro en Google Drive.
            </p>
            <form onSubmit={handleCreateCollection}>
              <div style={{ marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="ej. usuarios, productos, logs"
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  className="input-dark"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewCollectionModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  Crear Colección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DROP COLECCIÓN (SAFETY GUARD) */}
      {showDropModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-rose)', marginBottom: '10px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Zona de Peligro: Drop Colección</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Esta acción eliminará permanentemente la colección <strong>'{activeCollection}'</strong> de la memoria RAM y <strong>destruirá su archivo JSON en Google Drive</strong>.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Escribe <strong>{activeCollection}</strong> para confirmar:
            </p>
            <input 
              type="text" 
              className="input-dark"
              style={{ width: '100%', marginBottom: '20px' }}
              value={dropConfirmInput}
              onChange={e => setDropConfirmInput(e.target.value)}
              placeholder={activeCollection}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => { setShowDropModal(false); setDropConfirmInput(''); }}>
                Cancelar
              </button>
              <button 
                className="btn-danger" 
                disabled={dropConfirmInput !== activeCollection}
                onClick={handleDropCollection}
                style={{ opacity: dropConfirmInput === activeCollection ? 1 : 0.5 }}
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BATCH IMPORT */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Importación Masiva en '{activeCollection}'
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Pega un arreglo de objetos JSON <code>[&#123;...&#125;, &#123;...&#125;]</code>. Cada registro recibirá automáticamente un ID único y timestamp.
            </p>
            <form onSubmit={handleBatchImport}>
              <textarea 
                className="textarea-dark"
                style={{ height: '240px', marginBottom: '20px' }}
                value={batchJsonData}
                onChange={e => setBatchJsonData(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBatchModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-accent">
                  Importar Registros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SCHEMA INSPECTOR */}
      {showSchemaModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Schema Analyzer: {schemaData?.collection}
              </h3>
              <span className="type-pill">{schemaData?.totalRecords} registros analizados</span>
            </div>
            <div className="table-wrapper" style={{ maxHeight: '350px', marginBottom: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Tipos Detectados</th>
                    <th>Presencia</th>
                    <th>Muestra</th>
                  </tr>
                </thead>
                <tbody>
                  {schemaData?.fields?.map(f => (
                    <tr key={f.field}>
                      <td style={{ color: '#fff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{f.field}</td>
                      <td>
                        {f.types.map(t => (
                          <span key={t} className="type-pill" style={{ marginRight: '4px' }}>{t}</span>
                        ))}
                      </td>
                      <td>{f.coveragePercent}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {typeof f.sample === 'object' ? JSON.stringify(f.sample) : String(f.sample ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowSchemaModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
