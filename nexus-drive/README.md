<div align="center">
  <img src="https://raw.githubusercontent.com/oscarlaradev/LATENCE-WORLD/main/design-assets/nexus-logo-highres.png" alt="NexusDrive Logo" width="160" height="160">
  
  <h1>NEXUSDRIVE ENTERPRISE</h1>
  <p><strong>The Immortal Cloud Database Suite powered by Google Drive Virtual File System (VFS).</strong></p>
  
  [![npm version](https://img.shields.io/npm/v/nexus-drive.svg?color=E2FF00&label=npm%20version)](https://www.npmjs.com/package/nexus-drive)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue.svg?logo=github)](https://github.com/oscarlaradev/LATENCE-WORLD)
  [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
</div>

<br />

---

### 🌐 Official Ecosystem Links
* 📦 **NPM Package:** [https://www.npmjs.com/package/nexus-drive](https://www.npmjs.com/package/nexus-drive)
* 🐙 **GitHub Repository:** [https://github.com/oscarlaradev/LATENCE-WORLD](https://github.com/oscarlaradev/LATENCE-WORLD)
* 🐞 **Issue Tracker & Discussions:** [https://github.com/oscarlaradev/LATENCE-WORLD/issues](https://github.com/oscarlaradev/LATENCE-WORLD/issues)

---

## ⚡ What is NexusDrive?

**NexusDrive** is a radical architectural breakthrough in database persistence. It bridges ultra-fast volatile RAM memory with zero-cost Google Drive cloud persistence:

1. **Sub-millisecond Reads & Writes:** Queries execute in RAM memory at hardware speeds (`O(1)`).
2. **Asynchronous Cloud VFS:** Mutations are asynchronously flushed in the background to your personal Google Drive account as structured JSON schemas.
3. **Hardware Agnostic & Immortal:** If your ephemeral host (Render, Heroku, Fly.io, Railway) restarts or crashes, NexusDrive automatically scans Google Drive on boot, rebuilds the memory tree, and achieves **zero data loss**.
4. **15GB Zero-Cost Storage:** Leverage 15 Gigabytes of free native cloud storage without recurring database licensing fees.
5. **Cyber-Brutalist Control Plane:** Ships with an integrated, high-performance web dashboard featuring a **Live Audit Trail**, **Data Studio**, **Schema Analyzer**, **Interactive API Sandbox**, and **Disaster Recovery Snapshots**.

---

## 🚀 Quick Start (Local Machine)

Install the global CLI to boot your local database cluster in seconds:

```bash
# 1. Install globally via NPM
npm install -g nexus-drive

# 2. Start the database engine & dashboard
nexus start
```

*On the very first launch, a browser window will automatically open asking for one-time Google OAuth authorization. The session token is stored securely in `~/.nexus-drive/token.json`.*

Once running:
* **Database Engine & REST API:** `http://localhost:3000`
* **Integrated Control Plane Dashboard:** Open `http://localhost:3000` in any browser.

---

## ☁️ 24/7 Cloud Deployment (Render, Heroku, Docker, VPS)

Deploy NexusDrive as a dedicated, private cloud database for your production apps, chatbots, and microservices.

### Step 1: Export Credentials
Run Nexus locally once to generate your token. Copy the contents of:
```bash
cat ~/.nexus-drive/token.json
```

### Step 2: Configure Environment Variables
On your cloud hosting dashboard (Render, Heroku, Railway, etc.), configure:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GOOGLE_TOKEN` | Full JSON string copied from `token.json` | `{"type":"authorized_user", ...}` |
| `NEXUS_PASSWORD` | Master key to lock down the dashboard and API | `sec_prod_99xK72mQ` |
| `PORT` | Web port (automatically assigned on most cloud hosts) | `3000` |

### Step 3: Security & Master Key
When `NEXUS_PASSWORD` is configured:
* The web dashboard displays a cyber-brutalist master key authentication gate.
* All REST endpoints require the HTTP header:
```http
x-api-key: YOUR_NEXUS_PASSWORD
```

---

## 🔌 Complete REST API Specification

NexusDrive exposes an enterprise JSON REST API with query filtering, sorting, pagination, and batch operations.

### 1. Document CRUD & Query Engine

#### Fetch Collection Records (With Filtering, Pagination & Sorting)
```http
GET /db/:collection?search=query&limit=25&page=1&sort=_updatedAt&order=desc
x-api-key: YOUR_NEXUS_PASSWORD
```

#### Insert Single Document
```http
POST /db/:collection
Content-Type: application/json
x-api-key: YOUR_NEXUS_PASSWORD

{
  "name": "Alex Mercer",
  "email": "alex@latence.world",
  "tier": "enterprise",
  "active": true
}
```

#### Update Document by ID
```http
PUT /db/:collection/:id
Content-Type: application/json
x-api-key: YOUR_NEXUS_PASSWORD

{
  "tier": "vip"
}
```

#### Delete Document by ID
```http
DELETE /db/:collection/:id
x-api-key: YOUR_NEXUS_PASSWORD
```

---

### 2. Enterprise Schema & Batch Processing

#### Batch Import (Bulk Insert)
```http
POST /db/:collection/batch
Content-Type: application/json
x-api-key: YOUR_NEXUS_PASSWORD

[
  { "sku": "A-100", "price": 49.99 },
  { "sku": "B-200", "price": 99.00 }
]
```

#### Dynamic Schema Analyzer
```http
GET /db/:collection/schema
x-api-key: YOUR_NEXUS_PASSWORD
```

---

### 3. Collection Management

#### List All Active Collections
```http
GET /db
x-api-key: YOUR_NEXUS_PASSWORD
```

#### Create New Collection
```http
POST /api/collections
Content-Type: application/json
x-api-key: YOUR_NEXUS_PASSWORD

{
  "name": "transacciones_2026"
}
```

#### Drop Collection (Deletes from RAM and Google Drive)
```http
DELETE /api/collections/:name
x-api-key: YOUR_NEXUS_PASSWORD
```

---

### 4. Telemetry, Snapshots & Disaster Recovery

#### Live Telemetry & Audit Logs
```http
GET /api/telemetry
x-api-key: YOUR_NEXUS_PASSWORD
```

#### Full Database Snapshot (Backup)
```http
GET /api/backup
x-api-key: YOUR_NEXUS_PASSWORD
```

#### Restore Database from Snapshot
```http
POST /api/restore
Content-Type: application/json
x-api-key: YOUR_NEXUS_PASSWORD

{
  "collections": {
    "usuarios": [ ... ],
    "pedidos": [ ... ]
  }
}
```

#### Force Immediate Cloud Sync
```http
POST /api/sync/force
x-api-key: YOUR_NEXUS_PASSWORD
```

---

## 💻 Multi-Language Integration Snippets

### JavaScript / TypeScript (`fetch`)
```javascript
const API_URL = 'http://localhost:3000';
const MASTER_KEY = 'YOUR_NEXUS_PASSWORD';

// Insert a record
const response = await fetch(`${API_URL}/db/clientes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': MASTER_KEY
  },
  body: JSON.stringify({
    empresa: 'Latence World',
    status: 'activo'
  })
});

const data = await response.json();
console.log('Record inserted:', data);
```

### Python (`requests`)
```python
import requests

API_URL = "http://localhost:3000"
HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_NEXUS_PASSWORD"
}

# Fetch collection with search filter
res = requests.get(f"{API_URL}/db/clientes?search=Latence", headers=HEADERS)
print(res.json())
```

### cURL
```bash
curl -X POST "http://localhost:3000/db/clientes" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_NEXUS_PASSWORD" \
  -d '{"empresa": "Latence World", "status": "activo"}'
```

---

## ⚖️ License
Released under the **MIT License**. Created by **Oscar Perez** (2026).
Feel free to contribute, open issues, or submit PRs on [GitHub](https://github.com/oscarlaradev/LATENCE-WORLD).
