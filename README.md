# Personal Diary App

A simple, private diary application built with:
- **Frontend**: React (Vite) with a clean, responsive UI
- **Backend**: Express.js with RESTful API
- **Database**: MySQL for persistent storage
- **Deployment**: Ready for cPanel deployment with CI/CD via GitHub Actions

## Features

- 📝 Create, view, and delete diary entries
- 🕒 Automatic timestamps for all entries
- ✨ Clean, responsive design
- 🔒 Private - your entries stay on your server
- 🚀 Easy deployment to cPanel

## 🚀 Deployment Guide

### Prerequisites

1. cPanel hosting with:
   - Node.js version 18+
   - MySQL database
   - SSH access
2. GitHub account
3. Domain name (e.g., dev.eliasshamil.com)

### 1. cPanel Setup

#### Create Application Directory
1. Log in to cPanel
2. Open **File Manager**
3. Navigate to `/home/eliassqr/apps/`
4. Create a new directory called `dev`
5. Inside `dev`, create a `tmp` directory
6. Set permissions:
   ```bash
   chmod 750 /home/eliassqr/apps/dev
   chmod 770 /home/eliassqr/apps/dev/tmp
   ```

#### Configure Node.js Application
1. In cPanel, go to **Setup Node.js App**
2. Click **CREATE APPLICATION**
   - Node.js version: 18
   - Application mode: Production
   - Application root: `/home/eliassqr/apps/dev`
   - Application URL: `dev.eliasshamil.com`
   - Application startup file: `server.js`
3. Click **CREATE**

#### Set Up MySQL Database
1. In cPanel, go to **MySQL® Databases**
2. Create a new database: `eliassqr_diary`
3. Create a database user with a strong password
4. Add the user to the database with **ALL PRIVILEGES**
5. Note down the database name, username, and password

### 2. GitHub Repository Setup

1. Create a new GitHub repository
2. Push your code to the repository
3. Add the following GitHub Secrets (Settings > Secrets > Actions):
   - `CPANEL_USER`: Your cPanel username (`eliassqr`)
   - `CPANEL_SSH_KEY`: Your private SSH key (for deployment)
   - `DB_HOST`: Your database host (usually `localhost`)
   - `DB_USER`: Your database username
   - `DB_PASS`: Your database password
   - `DB_NAME`: Your database name (e.g., `eliassqr_diary`)

### 3. Deploy with GitHub Actions

1. Push your code to the `main` branch
2. GitHub Actions will automatically trigger the deployment
3. Check the Actions tab for deployment status

### 4. Configure Domain (if needed)

1. In cPanel, go to **Domains** > **Create a New Domain**
2. Enter `dev.eliasshamil.com`
3. Set the document root to `/home/eliassqr/apps/dev`
4. Enable SSL certificate (Let's Encrypt)

## 🔧 Manual Deployment (Alternative)

If you need to deploy manually:

```bash
# On your local machine
npm install
npm run client:build

# Create deployment package
tar -czf deploy.tar.gz ./

# Upload to server
scp deploy.tar.gz eliassqr@dev.eliasshamil.com:/home/eliassqr/apps/dev/tmp/

# SSH into server
ssh eliassqr@dev.eliasshamil.com

# On server
cd /home/eliassqr/apps/dev
rm -rf *
tar -xzf tmp/deploy.tar.gz
npm ci --production

# Restart application
touch tmp/restart.txt
```

## 🔒 Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use strong passwords for database access
- Enable HTTPS for all connections
- Regularly update your dependencies

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## Local development

1. Install Node.js 18+.
2. Install dependencies:
   - Root: `npm ci`
   - Client: `npm ci --prefix client`
3. Create `.env` at repository root (or use `.env.example`):

```
PORT=3000
DB_HOST=localhost
DB_USER=myuser
DB_PASS=mypassword
DB_NAME=mydatabase
```

4. Run both server and client in dev mode:

```
npm run dev
```

- React dev server is proxied to `/api` -> `http://localhost:3000`.
- Express runs on port `3000` and serves API routes.

## Express API

- `GET /api/hello` -> `{ "message": "Hello from Express" }`
- `GET /api/users` -> `SELECT id, name, email FROM users LIMIT 5` from the configured MySQL database.

## Prepare cPanel app directory

- Path: `/home/eliassqr/apps/dev`
- Create the directory via File Manager or SSH: `mkdir -p /home/eliassqr/apps/dev/tmp`
- Upload permission: ensure your SSH user `eliassqr` can write to this directory.

## Configure Node.js app in cPanel

1. In cPanel, open "Setup Node.js App".
2. Create an application:
   - Application root: `/home/eliassqr/apps/dev`
   - Application URL: `dev.eliasshamil.com`
   - Application startup file: `server.js`
   - Node.js version: 18+
3. Environment variables (via the Node.js app settings):
   - `PORT` = `3000`
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` as required
4. Save and create the app. You can restart from this screen if needed.

Alternatively, if you use PM2 on the server, `deploy.sh` will use it and name the process `dev-app`.

## Point subdomain to the app

- In cPanel -> Domains -> Create Subdomain `dev.eliasshamil.com`.
- Document root should be the same as the Node.js app (or managed by Passenger). For cPanel Node.js apps, Passenger serves from `app.js/server.js` directly.
- If you created the Node.js app with the URL set to `dev.eliasshamil.com`, cPanel will route traffic automatically.

## GitHub Actions CI/CD

Required repository secrets (Settings -> Secrets and variables -> Actions -> New repository secret):

- `CPANEL_USER` = `eliassqr`
- `CPANEL_SSH_KEY` = your private key content (PEM). Use a dedicated deploy key for security.
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` for production DB.

Workflow behavior:

1. On push to `main`, it checks out the repo.
2. Installs dependencies and builds the React client into `client/build`.
3. Packages `server.js`, `package.json`, `package-lock.json`, and `client/build` into `build.tar.gz`.
4. Uploads `build.tar.gz` and `deploy.sh` to `/home/eliassqr/apps/dev/tmp` over SSH.
5. Runs `deploy.sh` on the server with DB env vars exported.
6. `deploy.sh` extracts into `/home/eliassqr/apps/dev`, installs production deps, and restarts with PM2 if present, otherwise touches `tmp/restart.txt` for cPanel Passenger.

## Manual deploy (optional)

```
# From repo root
npm ci
npm ci --prefix client
npm run build --prefix client

tar -czf build.tar.gz server.js package.json package-lock.json client/build

# Upload build.tar.gz & deploy.sh to the server tmp dir, then SSH:
ssh -i <key> eliassqr@dev.eliasshamil.com "export PORT=3000 DB_HOST=... DB_USER=... DB_PASS=... DB_NAME=...; bash /home/eliassqr/apps/dev/deploy.sh"
```

## Notes

- Ensure your MySQL user has remote access if your Node.js app runs on a different host than the DB.
- For security, do not commit `.env`.
- If `npm install --production` triggers client build, `deploy.sh` temporarily disables scripts to skip it.
