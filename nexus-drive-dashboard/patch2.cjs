const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target = `{/* Left Collections List */}
                <div className="card" style={{ padding: '16px', height: 'fit-content' }}>`;

const replacement = `{/* Left Collections List */}
                <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Base de Datos Actual
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        className="input-dark" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                        value={activeDatabase}
                        onChange={(e) => setActiveDatabase(e.target.value)}
                      >
                        {databases.length === 0 && <option value="">---</option>}
                        {databases.map(db => <option key={db} value={db}>{db}</option>)}
                      </select>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0 10px' }}
                        onClick={() => setShowNewDatabaseModal(true)}
                        title="Nueva Base de Datos"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/App.jsx', code);
console.log("Patched UI successfully");
