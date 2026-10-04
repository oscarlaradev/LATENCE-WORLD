<div align="center">
  <img src="https://raw.githubusercontent.com/oscarlaradev/LATENCE-WORLD/main/design-assets/nexus-logo-highres.png" alt="NexusDrive" width="200" height="200">
  
  <h1>THE IMMORTAL DATABASE</h1>
  <p><strong>Transform your Google Drive into a high-performance, serverless database engine.</strong></p>
  
  [![npm version](https://badge.fury.io/js/nexus-drive.svg)](https://badge.fury.io/js/nexus-drive)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br />

**NexusDrive** is a radical new approach to persistence. It acts as an in-memory caching proxy that instantly flushes data directly to your personal Google Drive (via the Virtual File System). You get **15GB of zero-cost database storage**, 100% data ownership, and extreme resilience for ephemeral environments.

---

### 🔥 Features

* **Zero Hosting Costs:** Why pay for MongoDB Atlas when you have 15GB of free Drive storage?
* **Hardware Agnostic:** If your Render instance restarts or your laptop dies, NexusDrive instantly recovers the schema from the cloud on boot.
* **Built-in Dashboard:** Ships with a breathtaking React UI on port 3000 to manage collections and data via a sleek interface.
* **Global CLI:** Install it anywhere, run `nexus start`, and your machine becomes a serverless database node.

### 🚀 Quick Start

**1. Install globally**
```bash
npm install -g nexus-drive
```

**2. Awaken the engine**
```bash
nexus start
```
*On first boot, the CLI will authenticate with Google to establish a secure link with your Drive.*

**3. Open the Dashboard**
Navigate to `http://localhost:3000` to manage your collections visually.

### 🔌 REST API Contract

Once running, NexusDrive exposes a lightweight REST API for your apps (React, Node, Python, Chatbots, etc):

```javascript
// Fetch a collection
GET http://localhost:3000/db/users

// Insert a document
POST http://localhost:3000/db/users
Content-Type: application/json
{ "name": "John Doe", "role": "admin" }

// Update a document
PUT http://localhost:3000/db/users/12345
```

### 🧠 Architecture

`NexusDrive` creates a seamless bridge between fast volatile memory and slow persistent storage:
1. **Reads** are `O(1)` as they pull directly from the local RAM cache.
2. **Writes** immediately update the RAM state (instant client response) and trigger an asynchronous background worker that syncs the JSON diff to the Google Drive API.
3. **Recovery:** On boot, it scans your Drive for `nexus_db_*.json` files and reconstructs the memory tree.

### 👨‍💻 Author
Created by **Oscar Perez** as part of an architectural exploration into decentralized DBaaS systems.
