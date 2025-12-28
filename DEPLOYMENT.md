# 🚀 LedgerX Deployment & Setup Guide

This guide ensures you can run LedgerX locally and deploy it to production seamlessly.

## 💻 Local Development
Run both services with a single command from the root directory:
1. **Install dependencies**:
   ```bash
   npm run install:all
   ```
2. **Start Backend & Frontend**:
   ```bash
   npm run dev
   ```

---

## ☁️ Deploy to Render (Easiest)
### Backend
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Env Vars**: Copy from `backend/.env`

### Frontend
- **Build Command**: `npm install && npm run build` (Render detects Next.js automatically)
- **Start Command**: `npm start`
- **Env Vars**: `NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1`

---

## 🛡️ Deploy to AWS EC2
1. **SSH into EC2 and Install Node/Git**.
2. **Clone Repo** and `cd backend`.
3. **Setup Environment**: `nano .env` and paste your production vars.
4. **Build & Manage with PM2**:
   ```bash
   npm install
   npm run build
   npm install pm2 -g
   pm2 start ecosystem.config.js
   ```

---

## 🐳 Docker (Optional)
If you prefer containers:
```bash
cd backend
docker build -t ledgerx-backend .
docker run -p 5000:5000 ledgerx-backend
```
