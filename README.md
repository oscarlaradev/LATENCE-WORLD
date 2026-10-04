<div align="center">
  <img src="https://raw.githubusercontent.com/oscarlaradev/LATENCE-WORLD/main/design-assets/nexus-logo-highres.png" alt="NexusDrive" width="200" height="200">
  
  <h1>THE IMMORTAL DATABASE</h1>
  <p><strong>Transform your Google Drive into a high-performance, serverless database engine.</strong></p>
  
  [![npm version](https://badge.fury.io/js/nexus-drive.svg)](https://www.npmjs.com/package/nexus-drive)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br />

Welcome to **NexusDrive**, a radical new approach to persistence. This repository houses the entire ecosystem of the Immortal Database.

🔗 **[Official NPM Package: nexus-drive](https://www.npmjs.com/package/nexus-drive)**

## 📂 Ecosystem Structure

This repository is divided into three main components:

1. **`/nexus-drive`**: The core Node.js serverless engine. It acts as an in-memory caching proxy that instantly flushes data directly to your personal Google Drive. This is the package published to NPM.
2. **`/nexus-drive-dashboard`**: The React/Vite source code for the deeply integrated GUI dashboard. This compiles directly into the core engine to be served on port 3000.
3. **`/nexus-landing`**: A breathtaking, ultra-minimalist landing page built in React that breaks traditional design paradigms.

## 🚀 Quick Start (Using NPM)

You do not need to clone this repository to use the database locally. Simply install the global package:

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

## ☁️ Cloud Deployment (Render, Heroku, etc.)

NexusDrive is designed to be deployed as a 24/7 cloud database for your apps (like Chatbots, APIs, etc). 

To deploy without a local browser prompt:
1. Set the `GOOGLE_TOKEN` environment variable on your host (copy the contents from `~/.nexus-drive/token.json` on your local machine).
2. Set the `NEXUS_PASSWORD` environment variable to secure your endpoints (e.g., `NEXUS_PASSWORD=mySuperSecretKey`).

When `NEXUS_PASSWORD` is set, all API and Dashboard routes are strictly protected using Basic Authentication.

## 🔌 REST API Contract

Once running, NexusDrive exposes a lightweight JSON API:

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

---
*Created by Oscar Perez. 2026.*
