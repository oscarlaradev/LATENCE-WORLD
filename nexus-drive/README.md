<div align="center">
  <img src="https://raw.githubusercontent.com/oscarlaradev/LATENCE-WORLD/main/design-assets/nexus-logo-highres.png" alt="NexusDrive" width="200" height="200">
  
  <h1>THE IMMORTAL DATABASE</h1>
  <p><strong>Transform your Google Drive into a high-performance, serverless database engine.</strong></p>
  
  [![npm version](https://badge.fury.io/js/nexus-drive.svg)](https://badge.fury.io/js/nexus-drive)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br />

**NexusDrive** is a radical new approach to persistence. It acts as an in-memory caching proxy that instantly flushes data directly to your personal Google Drive (via the Virtual File System). You get **15GB of zero-cost database storage**, 100% data ownership, extreme resilience for ephemeral environments, and a built-in visual dashboard.

---

### 🔥 Core Features

* **Zero Hosting Costs:** Stop paying for managed databases. Leverage the 15GB of free storage provided natively by Google Drive.
* **Hardware Agnostic & Immortal:** If your cloud container (Render, Heroku) restarts or your laptop dies, NexusDrive instantly recovers the entire schema from Google Drive on the next boot.
* **Built-in Dashboard:** Ships with a breathtaking React GUI served on port 3000 to manage collections visually.
* **Bank-Grade Security:** Native Basic Auth protection via environment variables to lock down your API and Dashboard when deployed to the cloud.

### 🚀 Quick Start (Local Development)

**1. Install globally**
```bash
npm install -g nexus-drive
```

**2. Awaken the engine**
```bash
nexus start
```
*On first boot, the CLI will open your browser to authenticate with Google and establish a secure, local link with your Drive.*

**3. Open the Dashboard**
Navigate to `http://localhost:3000` to manage your database visually.

### ☁️ Cloud Deployment (Render, Heroku, etc.)

NexusDrive is designed to be deployed as a 24/7 cloud database for your apps (like Chatbots, APIs, etc). 

To deploy without a local browser prompt:
1. Set the `GOOGLE_TOKEN` environment variable on your host (copy the contents from `~/.nexus-drive/token.json` on your local machine).
2. Set the `NEXUS_PASSWORD` environment variable to secure your endpoints (e.g., `NEXUS_PASSWORD=mySuperSecretKey`).

When `NEXUS_PASSWORD` is set, all API and Dashboard routes are strictly protected using Basic Authentication.

### 🔌 REST API Contract

Once running (locally or in the cloud), NexusDrive exposes a lightweight JSON API:

```javascript
// 1. Fetch all collections
GET http://localhost:3000/db

// 2. Fetch a specific collection
GET http://localhost:3000/db/users

// 3. Insert a document
POST http://localhost:3000/db/users
Content-Type: application/json
{ "name": "John Doe", "role": "admin" }

// 4. Update a document
PUT http://localhost:3000/db/users/12345
Content-Type: application/json
{ "name": "John Doe", "role": "super-admin" }

// 5. Delete a document
DELETE http://localhost:3000/db/users/12345
```
*(Note: If `NEXUS_PASSWORD` is active, remember to send the `Authorization: Basic <base64>` header).*

### 🧠 Architecture

`NexusDrive` creates a seamless bridge between fast volatile memory and slow persistent storage:
1. **Reads** are `O(1)` as they pull directly from the local RAM cache.
2. **Writes** immediately update the RAM state (instant client response) and trigger an asynchronous background worker that syncs the JSON diff to the Google Drive API.
3. **Recovery:** On boot, it scans your Drive for `nexus_db_*.json` files and perfectly reconstructs the memory tree.

### 👨‍💻 Author
Created by **Oscar Perez** as part of an architectural exploration into decentralized DBaaS systems (2026).
