# 🏙️ JAGRUK – Civic Issue Reporting System

> *Empowering citizens. Enabling transparency. Building smarter cities.*

---

## 🚀 Overview
**JAGRUK** (Janta App for Grievance Reporting and User Knowledge) is a full-stack web platform designed to bridge the communication gap between **citizens and local authorities**.  
It enables users to **report civic issues** (like potholes, waste, broken lights, etc.), track their progress in real-time, and promote **community-driven governance**.

---

## ✨ Features

### 🧍 For Citizens
- 📍 **Location-based issue reporting** using an interactive map (Leaflet.js)
- 📸 Upload issue photos and detailed descriptions  
- 🔍 Search and view reports from nearby areas  
- 🔄 Real-time issue status tracking (Submitted → Acknowledged → In Progress → Resolved)
- 📢 Transparent and public issue visibility

### 🧑‍💼 For Administrators
- 🧾 **Admin Dashboard** for managing and prioritizing issues  
- 🚫 **Quarantine System** to filter duplicate or spam reports  
- 🔗 **Duplicate Issue Linking** for cleaner data and faster resolution  
- 📊 Generate reports with status summaries and analytics  
- ✅ JWT-based secure login & session management

---

## 🧠 Technical Overview

| Layer | Technology |
|-------|-------------|
| **Frontend** | React.js + Tailwind CSS |
| **Maps & Location** | Leaflet.js |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (Atlas / local) |
| **Authentication** | JWT |
| **Deployment** | Frontend → Netlify<br>Backend → Render |
| **Storage** | Local uploads on backend *(migratable to Cloudinary / S3)* |

---

## ⚙️ Setup Instructions

### 🔧 Prerequisites
- Node.js (v16+)
- MongoDB or MongoDB Atlas account
- Git & npm/yarn

### 🛠️ Backend Setup
```bash
cd civicreport-backend
npm install

### 💻 Frontend Setup
```
cd src
npm install
npm run dev

🌐 Deployment
```
Frontend: Hosted on Netlify
Backend: Hosted on Render
MongoDB: Hosted on MongoDB Atlas
Ensure BACKEND_URL in .env points to your Render app URL.
```
🧩 Folder Structure
```
JAGRUK/
│
├── civicreport-backend/
│   ├── server.js
│   ├── uploads/
│   ├── reports.json
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── context/
│
└── README.md

```
🔒 Security Highlights
```
JWT-based admin authentication
CORS protection for secure frontend-backend communication
Sanitized file uploads (JPEG, PNG, WEBP, GIF only)
Automatic quarantine for flagged or duplicate issues
```

🌟 Unique Selling Points (USP)
```
🧠 Smart Quarantine & Duplicate Linking System
Prevents spam and redundant reports for cleaner admin data.

📡 Real-Time Map Visualization
Displays live civic issues on an interactive map.

🧾 Transparent Tracking
Citizens can see every update until resolution.

⚡ Lightweight & Scalable Stack
Tailwind + Node + Mongo = fast and efficient.

🌍 Community-Driven Reporting
Encourages citizens to participate in improving their cities.
```
📸 Demo
```
🔗 Live Website: https://civicreports.netlify.app/
⚙️ Backend API: https://your-backend.onrender.com
```
🏁 License
```
This project is released under the MIT License.
Feel free to use, modify, and build upon it for community benefit.

