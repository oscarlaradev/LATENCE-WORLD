const fs = require('fs');
let code = fs.readFileSync('nexus-drive-dashboard/src/App.jsx', 'utf8');

// 1. States
code = code.replace(
  "const [collections, setCollections] = useState([]);",
  "const [databases, setDatabases] = useState([]);\n  const [activeDatabase, setActiveDatabase] = useState('');\n  const [showNewDatabaseModal, setShowNewDatabaseModal] = useState(false);\n  const [newDatabaseName, setNewDatabaseName] = useState('');\n  const [collections, setCollections] = useState([]);"
);

// 2. fetchDatabases & fetchCollections
code = code.replace(
  "const fetchCollections = async () => {\n    try {\n      setLoading(true);\n      const res = await apiFetch('/db');\n      const data = await res.json();\n      const cols = data.collections || [];\n      setCollections(cols);\n      if (cols.length > 0 && (!activeCollection || !cols.includes(activeCollection))) {\n        setActiveCollection(cols[0]);\n      }\n    } catch (e) {\n      console.error(e);\n    } finally {\n      setLoading(false);\n    }\n  };",
  `const fetchDatabases = async () => {
    try {
      const res = await apiFetch('/db');
      const data = await res.json();
      const dbs = data.databases || [];
      setDatabases(dbs);
      if (dbs.length > 0 && !activeDatabase) {
        setActiveDatabase(dbs[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCollections = async () => {
    if (!activeDatabase) return;
    try {
      setLoading(true);
      const res = await apiFetch(\`/db/\${activeDatabase}\`);
      const data = await res.json();
      const cols = data.collections || [];
      setCollections(cols);
      if (cols.length > 0 && (!activeCollection || !cols.includes(activeCollection))) {
        setActiveCollection(cols[0]);
      } else if (cols.length === 0) {
        setActiveCollection('');
        setRecords([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`
);

// 3. fetchRecords
code = code.replace(
  "const res = await apiFetch(`/db/${col}${queryParam}`);",
  "const res = await apiFetch(`/db/${activeDatabase}/${col}${queryParam}`);"
);

// 4. useEffect hooks
code = code.replace(
  "fetchCollections();\n      } else if (activeTab === 'colecciones') {\n        fetchCollections();",
  "fetchDatabases();\n      } else if (activeTab === 'colecciones') {\n        fetchDatabases();"
);
code = code.replace(
  "useEffect(() => {\n    if (activeTab === 'colecciones' && activeCollection && (!isProtected || isAuthenticated)) {\n      fetchRecords(activeCollection);\n    }\n  }, [activeCollection, recordSearch, activeTab]);",
  "useEffect(() => { if (activeDatabase && (!isProtected || isAuthenticated)) { fetchCollections(); } }, [activeDatabase]);\n\n  useEffect(() => {\n    if (activeTab === 'colecciones' && activeCollection && (!isProtected || isAuthenticated)) {\n      fetchRecords(activeCollection);\n    }\n  }, [activeCollection, recordSearch, activeTab]);"
);

// 5. handleCreateCollection
code = code.replace(
  "const res = await apiFetch('/api/collections'",
  "if (!activeDatabase) { alert('Selecciona una base de datos primero.'); return; }\n      const res = await apiFetch(`/api/${activeDatabase}/collections`"
);

// 6. handleSaveRecord
code = code.replace(
  "await apiFetch(`/db/${activeCollection}/${currentRecordId}`",
  "await apiFetch(`/db/${activeDatabase}/${activeCollection}/${currentRecordId}`"
);
code = code.replace(
  "await apiFetch(`/db/${activeCollection}`",
  "await apiFetch(`/db/${activeDatabase}/${activeCollection}`"
);

// 7. handleDeleteRecord
code = code.replace(
  "await apiFetch(`/db/${activeCollection}/${id}`",
  "await apiFetch(`/db/${activeDatabase}/${activeCollection}/${id}`"
);

// 8. handleDropCollection
code = code.replace(
  "const res = await apiFetch(`/api/collections/${activeCollection}`",
  "const res = await apiFetch(`/api/${activeDatabase}/collections/${activeCollection}`"
);

// 9. handleBatchImport
code = code.replace(
  "const res = await apiFetch(`/db/${activeCollection}/batch`",
  "const res = await apiFetch(`/db/${activeDatabase}/${activeCollection}/batch`"
);

// 10. handleInspectSchema
code = code.replace(
  "const res = await apiFetch(`/db/${activeCollection}/schema`);",
  "const res = await apiFetch(`/db/${activeDatabase}/${activeCollection}/schema`);"
);

// 11. handleCreateDatabase (new function)
code = code.replace(
  "const handleCreateCollection = async (e) => {",
  `const handleCreateDatabase = async (e) => {
    e.preventDefault();
    if (!newDatabaseName.trim()) return;
    try {
      const res = await apiFetch(\`/api/\${newDatabaseName.trim()}/collections\`, {
        method: 'POST',
        body: JSON.stringify({ name: 'default_collection' })
      });
      if (res.ok) {
        showToast('Base de datos inicializada.');
        setNewDatabaseName('');
        setShowNewDatabaseModal(false);
        await fetchDatabases();
        setActiveDatabase(newDatabaseName.trim());
      }
    } catch(err) {
      alert(err.message);
    }
  };

  const handleCreateCollection = async (e) => {`
);

// 12. UI for Data Studio (adding DB selector)
code = code.replace(
  "<div className=\"collections-header\">",
  `<div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Database size={16} color="var(--accent)" />
      <select 
        value={activeDatabase} 
        onChange={e => setActiveDatabase(e.target.value)}
        className="input-dark"
        style={{ flex: 1, padding: '8px' }}
      >
        {databases.length === 0 && <option value="">Sin bases de datos</option>}
        {databases.map(db => (
          <option key={db} value={db}>{db}</option>
        ))}
      </select>
      <button className="btn-secondary" onClick={() => setShowNewDatabaseModal(true)} title="Nueva Base de Datos">
        <Plus size={14} />
      </button>
    </div>
    <div className="collections-header">`
);

// 13. Add Modal for New Database
code = code.replace(
  "{/* Create Collection Modal */}",
  `{/* Create Database Modal */}
      {showNewDatabaseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>Crear Nueva Base de Datos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Se creará una nueva carpeta en Google Drive y un nuevo namespace en memoria.
            </p>
            <form onSubmit={handleCreateDatabase}>
              <input 
                type="text"
                placeholder="Nombre de la Base de Datos (ej. mi_tienda)"
                value={newDatabaseName}
                onChange={e => setNewDatabaseName(e.target.value)}
                className="input-dark"
                style={{ width: '100%', marginBottom: '20px' }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewDatabaseModal(false)}>Cancelar</button>
                <button type="submit" className="btn-accent">CREAR BASE DE DATOS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}`
);

fs.writeFileSync('nexus-drive-dashboard/src/App.jsx', code);
console.log("Patched successfully");
