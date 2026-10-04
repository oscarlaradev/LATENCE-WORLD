import React, { useEffect } from 'react';
import { Terminal, Database, Shield, Zap, Cloud, ArrowRight, Code2 } from 'lucide-react';
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={() => document.getElementById('docs').scrollIntoView({behavior: 'smooth'})}>
            Docs
          </button>
          <button className="btn btn-accent" onClick={() => window.open('https://github.com/oscarlaradev/LATENCE-WORLD', '_blank')}>
            GitHub
          </button>
          <button className="btn btn-accent" style={{ background: '#cb3837', color: 'white', borderColor: '#cb3837' }} onClick={() => window.open('https://www.npmjs.com/package/nexus-drive', '_blank')}>
            NPM
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
                <div className="code-line"><span className="code-comment">// Query with search, pagination & sort</span></div>
                <div className="code-line"><span className="code-command">GET /db/:collection?search=query&amp;limit=25</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Insert a document</span></div>
                <div className="code-line"><span className="code-command">POST /db/:collection</span></div>
                <div className="code-line"><span className="code-command">Header: x-api-key: YOUR_KEY</span></div>
                
                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Bulk batch insertion</span></div>
                <div className="code-line"><span className="code-command">POST /db/:collection/batch</span></div>

                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Dynamic schema analyzer</span></div>
                <div className="code-line"><span className="code-command">GET /db/:collection/schema</span></div>

                <div className="code-line" style={{ marginTop: '1rem' }}><span className="code-comment">// Full snapshot backup</span></div>
                <div className="code-line"><span className="code-command">GET /api/backup</span></div>
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
                <span style={{ color: 'var(--text-primary)' }}>2. Queries Drive for existing schema</span><br/>
                <span style={{ color: 'var(--text-primary)' }}>3. Rebuilds In-Memory RAM state</span><br/>
                <span style={{ color: 'var(--accent)' }}>4. Zero Data Loss Achieved.</span>
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
