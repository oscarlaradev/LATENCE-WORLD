import React, { useEffect } from 'react';
import { Terminal, Database, Shield, Zap, Cloud, ArrowRight, Code2, Heart } from 'lucide-react';
import './index.css';

function App() {
  
  // Subtle scroll reveal effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach((el) => {
      el.style.opacity = 0;
      el.style.transform = 'translateY(40px)';
      el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="container nav">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.svg" alt="NexusDrive Logo" style={{ width: '40px', height: '40px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => document.getElementById('docs').scrollIntoView({behavior: 'smooth'})}>
            Docs
          </button>
          <button className="btn" onClick={() => window.open('https://github.com/oscarlaradev/LATENCE-WORLD', '_blank')}>
            GitHub
          </button>
          <button className="btn" style={{ background: '#cb3837', color: 'white', borderColor: '#cb3837' }} onClick={() => window.open('https://www.npmjs.com/package/nexus-drive', '_blank')}>
            NPM
          </button>
          <button 
            className="btn btn-accent" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => window.open('https://www.paypal.com/donate/?business=aura.urbanidad%40gmail.com&no_recurring=0&item_name=Support+NexusDrive+Development&currency_code=USD', '_blank')}
          >
            <Heart size={15} fill="#050505" /> Donar
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section container">
        <div className="grid-2">
          <div className="reveal">
            <h1 className="hero-title">
              THE <br/>
              <span className="highlight">IMMORTAL</span> <br/>
              DATABASE
            </h1>
            <p className="hero-subtitle" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
              NexusDrive redefines serverless architecture. By transforming your Google Drive into a high-performance caching proxy, your data becomes resilient, infinite, and inherently yours. No hosting required.
            </p>
            <button className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              onClick={() => document.getElementById('install').scrollIntoView({behavior: 'smooth'})}>
              Initialize System <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="code-block">
              <div className="code-line">
                <span className="code-comment"># 1. Install globally via NPM</span>
              </div>
              <div className="code-line">
                <span className="code-number">1</span>
                <span className="code-command">npm <span style={{color: '#fff'}}>install</span> -g nexus-drive</span>
              </div>
              <div className="code-line" style={{marginTop: '1rem'}}>
                <span className="code-comment"># 2. Awaken the engine</span>
              </div>
              <div className="code-line">
                <span className="code-number">2</span>
                <span className="code-command">nexus start</span>
              </div>
              <div className="code-line" style={{marginTop: '1.5rem', opacity: 0.7}}>
                <span className="code-number"></span>
                <span className="code-command" style={{color: 'var(--accent)'}}>&gt; NexusDrive Core initialized on port 3000</span>
              </div>
              <div className="code-line" style={{opacity: 0.7}}>
                <span className="code-number"></span>
                <span className="code-command" style={{color: 'var(--accent)'}}>&gt; Virtual File System synced with Google Drive</span>
              </div>
              <div className="code-line" style={{opacity: 0.7}}>
                <span className="code-number"></span>
                <span className="code-command" style={{color: 'var(--accent)'}}>&gt; Immortal Server running.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Structure */}
      <section className="section container">
        <div className="reveal">
          <h2 className="display-text" style={{ fontSize: '3rem', marginBottom: '4rem', textAlign: 'center' }}>
            A NEW PARADIGM OF <span className="highlight">STORAGE</span>
          </h2>
        </div>
        
        <div className="grid-2">
          <div className="feature-card reveal">
            <Database size={40} color="var(--accent)" />
            <h3>Zero-Cost Persistence</h3>
            <p>Leverage the 15GB of free storage provided by Google Drive. For text-based JSON databases, this equates to virtually infinite storage capability without recurring cloud hosting fees.</p>
          </div>
          <div className="feature-card reveal" style={{ transitionDelay: '0.2s' }}>
            <Shield size={40} color="var(--accent)" />
            <h3>Hardware Agnostic</h3>
            <p>Deploy on a Raspberry Pi, an old laptop, or a free-tier ephemeral cloud host. If the hardware is destroyed or restarted, the data remains safely immortalized in the cloud.</p>
          </div>
          <div className="feature-card reveal">
            <Terminal size={40} color="var(--accent)" />
            <h3>Built-in Dashboard</h3>
            <p>NexusDrive ships with a deeply integrated React-based dashboard. One command (`nexus start`) boots both the REST API and the GUI interface simultaneously on the same port.</p>
          </div>
          <div className="feature-card reveal" style={{ transitionDelay: '0.2s' }}>
            <Zap size={40} color="var(--accent)" />
            <h3>In-Memory Proxy</h3>
            <p>Blazing fast reads and writes. NexusDrive holds your database in RAM for instant access, and asynchronously flushes mutations to Google Drive's VFS in the background.</p>
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section id="docs" className="section container">
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <h2 className="display-text" style={{ fontSize: '3.5rem', textAlign: 'right' }}>
            SYSTEM <span className="highlight">DOCUMENTATION</span>
          </h2>
        </div>

        <div className="grid-2">
          <div>
            <div className="doc-section reveal">
              <h3>REST API Contract v1.1.1</h3>
              <p>Interact with your database from any language, frontend, or backend. The core runs locally or on your deployed server, acting as the high-speed bridge to Google Drive.</p>
              
              <div className="code-block" style={{ marginTop: '1rem' }}>
                <div className="code-line"><span className="code-comment">// New: Multi-Tenant Architecture</span></div>
                <div className="code-line"><span className="code-command">GET /db/:database/:collection</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Query with Advanced Filtering ($gt, $lt, $in)</span></div>
                <div className="code-line"><span className="code-command">GET /db/my_client/users?age={"{"}"$gt": 18{"}"}</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Insert a document into a specific database</span></div>
                <div className="code-line"><span className="code-command">POST /db/my_client/users</span></div>
                <div className="code-line"><span className="code-command">Header: x-api-key: YOUR_KEY</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Interactive Swagger UI</span></div>
                <div className="code-line"><span className="code-command">GET /docs</span></div>
              </div>
            </div>
            
            <div className="doc-section reveal" style={{ marginTop: '2rem' }}>
              <h3>🔌 NexusDrive Client SDK</h3>
              <p>Connect any Frontend or Node.js project to your databases with a single line of code.</p>
              <div className="code-block" style={{ marginTop: '1rem' }}>
                <div className="code-line"><span className="code-comment">// 1. Install</span></div>
                <div className="code-line"><span className="code-command">npm install nexus-drive-client</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// 2. Initialize & Query</span></div>
                <div className="code-line"><span className="code-command">const db = new Nexus({"{url: 'http://localhost:3000'}"}).database('my_client');</span></div>
                <div className="code-line"><span className="code-command">const users = await db.collection('users').find();</span></div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="doc-section reveal" id="install">
              <h3>Enterprise Security &amp; Master Key</h3>
              <p>When deploying to the cloud (Render, Heroku, Docker, VPS), set the <code>NEXUS_PASSWORD</code> environment variable. NexusDrive automatically locks down the visual Control Plane and enforces authorization via the <code>x-api-key: YOUR_PASSWORD</code> HTTP header on all API endpoints.</p>
            </div>

            <div className="doc-section reveal">
              <h3>Ephemeral Cloud Hosting</h3>
              <p>Deploy NexusDrive to volatile cloud environments with zero risk. Set <code>GOOGLE_TOKEN</code> in your host's environment variables to authenticate silently without a browser prompt.</p>
              <div className="code-block" style={{ padding: '1rem' }}>
                <span className="code-comment">When the host inevitably restarts:</span><br/><br/>
                <span style={{ color: 'var(--text-primary)' }}>1. NexusDrive boots</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>2. Queries Drive for all Database Folders</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>3. Rebuilds In-Memory RAM state</span><br/>
                <span style={{ color: 'var(--accent)' }}>4. Zero Data Loss Achieved.</span>
              </div>
            </div>

            <div className="doc-section reveal">
              <h3>⚡ Real-Time WebSockets Engine</h3>
              <p>Listen to live changes across any database or collection seamlessly via the SDK.</p>
              <div className="code-block" style={{ padding: '1rem' }}>
                <span className="code-comment">// Listen for live updates</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>const db = nexus.database('my_client');</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>db.collection('users').onSnapshot((change) =&gt; {"{"}</span><br/>
                <span style={{ color: 'var(--accent)', marginLeft: '1rem' }}>console.log("Live Event:", change);</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>{"}"});</span>
              </div>
            </div>

            <div className="doc-section reveal">
              <h3>Official Ecosystem Links</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button className="btn btn-accent" onClick={() => window.open('https://www.npmjs.com/package/nexus-drive', '_blank')}>
                  NPM: nexus-drive
                </button>
                <button className="btn" onClick={() => window.open('https://github.com/oscarlaradev/LATENCE-WORLD', '_blank')}>
                  GitHub: LATENCE-WORLD
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation / Support Section */}
      <section id="donate" className="section container">
        <div className="reveal" style={{ 
          border: '1px solid var(--border)', 
          background: 'rgba(255, 255, 255, 0.02)', 
          padding: '4rem 3rem', 
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent)' }}></div>
          <div className="grid-2">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                <Heart size={16} fill="var(--accent)" /> Apoya el Proyecto Open Source
              </div>
              <h2 className="display-text" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
                IMPULSA EL FUTURO DE <span className="highlight">NEXUSDRIVE</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '1.5rem' }}>
                NexusDrive es un proyecto independiente y de código abierto. Tus donaciones permiten mantener la infraestructura, costear horas de desarrollo y acelerar nuevas integraciones (Redis VFS adapter, replicación PostgreSQL, soporte S3 multi-cloud).
              </p>
              <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                Cuenta oficial de donaciones PayPal: <strong style={{ color: '#fff' }}>aura.urbanidad@gmail.com</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '1.2rem' }}>
              <button 
                className="btn btn-accent" 
                style={{ 
                  padding: '1.2rem 2.5rem', 
                  fontSize: '0.85rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 0 30px rgba(226, 255, 0, 0.2)'
                }}
                onClick={() => window.open('https://www.paypal.com/donate/?business=aura.urbanidad%40gmail.com&no_recurring=0&item_name=Support+NexusDrive+Development&currency_code=USD', '_blank')}
              >
                <Heart size={18} fill="#050505" /> Donar con PayPal
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'JetBrains Mono' }}>
                Pago directo y seguro procesado por PayPal Inc.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '3rem 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Syncopate', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          Designed by Architecture &bull; Open Source Engine &bull; 2026
        </p>
      </footer>
    </div>
  );
}

export default App;

