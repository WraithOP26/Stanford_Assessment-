# Complete Setup Guide - Stanford AI Playground (LibreChat)

This comprehensive guide will walk you through setting up and running the Stanford AI Playground application from scratch to completion.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Building the Application](#building-the-application)
5. [Starting Docker Services](#starting-docker-services)
6. [Accessing the Application](#accessing-the-application)
7. [Creating Your First User](#creating-your-first-user)
8. [Configuring API Keys](#configuring-api-keys)
9. [Using Direct Attach Feature](#using-direct-attach-feature)
10. [Troubleshooting](#troubleshooting)
11. [Common Commands](#common-commands)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

1. **Node.js** (v18 or higher)
   - Check version: `node --version`
   - Download: [https://nodejs.org/](https://nodejs.org/)

2. **npm** (comes with Node.js)
   - Check version: `npm --version`

3. **Docker** and **Docker Compose**
   - Check Docker: `docker --version`
   - Check Docker Compose: `docker compose version`
   - Download: [https://www.docker.com/get-started](https://www.docker.com/get-started)

4. **Git**
   - Check version: `git --version`
   - Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)

### System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL2 recommended)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk Space**: At least 5GB free space
- **Ports**: Port 3080 must be available (or configure a different port)

---

## Initial Setup

### Step 1: Clone the Repository

If you haven't already cloned the repository:

```bash
git clone <repository-url>
cd Stanford_Assessment-
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

**Note**: This may take several minutes as it installs dependencies for the entire monorepo (client, API, and packages).

### Step 3: Verify Installation

Check that all dependencies are installed correctly:

```bash
npm list --depth=0
```

---

## Environment Configuration

### Step 1: Create `.env` File

Create a `.env` file in the root directory if it doesn't exist:

```bash
touch .env
```

### Step 2: Configure Essential Variables

Add the following minimum required variables to your `.env` file:

```env
# Server Configuration
PORT=3080

# User Authentication
ALLOW_UNVERIFIED_EMAIL_LOGIN=true
ALLOW_REGISTRATION=true

# Database & Services
MEILI_MASTER_KEY=your-meili-master-key-here

# OpenAI API Key (for Direct Attach transcription feature)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: RAG API Port (defaults to 8000)
RAG_PORT=8000
```

### Step 3: Generate Secure Keys

For production, generate secure keys using the LibreChat toolkit:

1. Visit: [https://www.librechat.ai/toolkit/creds_generator](https://www.librechat.ai/toolkit/creds_generator)
2. Generate the following keys:
   - `CREDS_KEY` (32 bytes hex)
   - `CREDS_IV` (16 bytes hex)
   - `JWT_SECRET` (32 bytes hex)
   - `JWT_REFRESH_SECRET` (32 bytes hex)
   - `MEILI_MASTER_KEY` (random string)

3. Add them to your `.env` file:

```env
CREDS_KEY=your-generated-creds-key
CREDS_IV=your-generated-creds-iv
JWT_SECRET=your-generated-jwt-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
MEILI_MASTER_KEY=your-generated-meili-key
```

**Note**: For development/testing, the application will use default values (with warnings).

---

## Building the Application

### Step 1: Build Packages

Build all internal packages first:

```bash
npm run build:packages
```

This builds:
- `data-provider` package
- `data-schemas` package
- `api` package
- `client` package

### Step 2: Build Client Frontend

Build the React frontend application:

```bash
npm run build:client
```

**Note**: This step is **required** before starting Docker, as the container expects the built client files in `client/dist/`.

### Step 3: Clear Cache (Important for Stanford Theme)

Clear the application cache to ensure the Stanford theme loads correctly:

```bash
npm run flush-cache
```

---

## Starting Docker Services

### Step 1: Start All Services

Start all Docker containers in detached mode:

```bash
docker compose up -d
```

This will start:
- **LibreChat** (main API server) - Port 3080
- **MongoDB** (database) - Port 27017
- **Meilisearch** (search engine) - Port 7700
- **VectorDB** (PostgreSQL with pgvector) - Port 5432
- **RAG API** (RAG service) - Port 8000

### Step 2: Verify Containers Are Running

Check that all containers are up:

```bash
docker ps
```

You should see 5 containers running:
- `LibreChat`
- `chat-mongodb`
- `chat-meilisearch`
- `vectordb`
- `rag_api`

### Step 3: Check Logs

Verify the LibreChat container started successfully:

```bash
docker logs LibreChat --tail 50
```

Look for:
```
Server listening on all interfaces at port 3080. Use http://localhost:3080 to access it
```

### Step 4: Restart API (if needed)

If you made changes to `.env` or configuration files:

```bash
docker compose restart api
```

---

## Accessing the Application

### Step 1: Open in Browser

Navigate to:

```
http://localhost:3080
```

### Step 2: First-Time Setup

On first access, you'll see the LibreChat interface. You'll need to create a user account (see next section).

---

## Creating Your First User

### Option 1: Create User via Command Line (Recommended)

Create a user account using the CLI:

```bash
npm run create-user
```

Follow the prompts:
- **Email**: Enter your email (e.g., `test@stanford.edu`)
- **Password**: Enter a secure password
- **Username**: Enter a username (e.g., `testuser`)

### Option 2: Register via UI

If `ALLOW_REGISTRATION=true` is set in your `.env`:

1. Click **"Sign Up"** or **"Register"** on the login page
2. Fill in your details
3. Submit the registration form

**Note**: With `ALLOW_UNVERIFIED_EMAIL_LOGIN=true`, you can log in immediately without email verification.

### Step 3: Log In

1. Go to `http://localhost:3080`
2. Enter your email and password
3. Click **"Sign In"**

---

## Configuring API Keys

### Option 1: Server-Wide API Key (Recommended for Development)

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Then restart the API:

```bash
docker compose restart api
```

### Option 2: User-Provided API Key (Recommended for Production)

1. Log in to the application
2. Navigate to **Settings** (gear icon)
3. Look for **API Keys** section (may be in a different tab)
4. Enter your OpenAI API key
5. Save the configuration

**Note**: The UI location for API keys may vary. If you don't see it, use Option 1 (server-wide key).

---

## Using Direct Attach Feature

The Direct Attach feature allows you to upload files directly to the model, bypassing the RAG/indexing pipeline.

### Step 1: Enable Direct Attach

1. In a chat conversation, click the **paperclip icon** (attachment button)
2. In the dropdown menu, toggle **"Direct Attach"** to **ON**
3. You'll see an **Upload icon** appear next to the paperclip

### Step 2: Upload Files

**For Video/Audio Files (with transcription):**
1. Click the **Upload icon** (appears when Direct Attach is ON)
2. Select a video or audio file
3. The system will automatically:
   - Generate a transcript using OpenAI Whisper API
   - Send the transcript as a message to the chat

**For Other File Types (CSV, PDF, DOC, etc.):**
1. Click the **Upload icon**
2. Select your file
3. The file will be uploaded and attached to your message
4. Ask questions about the file in the chat

**Note**: For non-audio/video files, Direct Attach bypasses RAG but the file content is sent directly to the model with your message.

### Step 3: Disable Direct Attach

To return to normal RAG/indexing flow:
1. Click the **paperclip icon**
2. Toggle **"Direct Attach"** to **OFF**

---

## Troubleshooting

### Issue: "This site can't be reached" or Connection Refused

**Solution:**
1. Check if Docker containers are running: `docker ps`
2. Check LibreChat logs: `docker logs LibreChat --tail 50`
3. Verify the client is built: `ls client/dist/index.html` (should exist)
4. If missing, rebuild: `npm run build:client`
5. Restart containers: `docker compose restart`

### Issue: "Token is not present. User is not authenticated"

**Solution:**
1. Create a user account: `npm run create-user`
2. Log in with the credentials you created
3. Clear browser cache and cookies
4. Try again

### Issue: Button Not Clickable (Direct Attach)

**Solution:**
1. Ensure you're logged in
2. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
3. Check browser console for errors
4. Verify the client is rebuilt: `npm run build:client && docker compose restart api`

### Issue: "Failed to fetch models from openAI API ... 401"

**Solution:**
1. Add `OPENAI_API_KEY` to your `.env` file
2. Restart the API: `docker compose restart api`
3. Or configure the API key in the UI (Settings → API Keys)

### Issue: Stanford Theme Not Showing

**Solution:**
1. Verify `librechat.yaml` exists in the repo root
2. Clear cache: `npm run flush-cache`
3. Restart API: `docker compose restart api`
4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: Direct Attach Transcription Not Working

**Solution:**
1. Ensure `OPENAI_API_KEY` is set in `.env`
2. Verify the key is valid and has access to Whisper API
3. Check server logs: `docker logs LibreChat --tail 100 | grep -i transcript`
4. Restart API: `docker compose restart api`

### Issue: Docker Containers Won't Start

**Solution:**
1. Check Docker is running: `docker ps`
2. Check for port conflicts: `lsof -i :3080` (or your configured port)
3. Stop all containers: `docker compose down`
4. Remove volumes (if needed): `docker compose down -v`
5. Start again: `docker compose up -d`

### Issue: Build Fails

**Solution:**
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. Try building again: `npm run build:packages && npm run build:client`

---

## Common Commands

### Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# Restart only the API
docker compose restart api

# View logs
docker logs LibreChat --tail 50
docker logs LibreChat -f  # Follow logs in real-time

# Check container status
docker ps

# Stop and remove all containers and volumes
docker compose down -v
```

### Build Commands

```bash
# Build all packages
npm run build:packages

# Build client only
npm run build:client

# Build everything (packages + client)
npm run frontend

# Clear cache
npm run flush-cache
```

### User Management Commands

```bash
# Create a new user
npm run create-user

# List all users
npm run list-users

# Reset user password
npm run reset-password

# Delete a user
npm run delete-user

# Ban a user
npm run ban-user
```

### Development Commands

```bash
# Run backend in development mode
npm run backend:dev

# Run frontend in development mode
npm run frontend:dev

# Run tests
npm run test:all

# Lint code
npm run lint

# Format code
npm run format
```

### Update Commands

```bash
# Update dependencies
npm run update

# Update and reinstall
npm run reinstall

# Update for Docker
npm run update:docker
```

---

## Quick Start Checklist

Use this checklist for a fresh setup:

- [ ] Prerequisites installed (Node.js, Docker, Git)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with required variables
- [ ] Packages built (`npm run build:packages`)
- [ ] Client built (`npm run build:client`)
- [ ] Cache cleared (`npm run flush-cache`)
- [ ] Docker containers started (`docker compose up -d`)
- [ ] Containers verified running (`docker ps`)
- [ ] Application accessible at `http://localhost:3080`
- [ ] User account created (`npm run create-user`)
- [ ] Logged in successfully
- [ ] API key configured (in `.env` or UI)
- [ ] Direct Attach feature tested

---

## Next Steps

After completing the setup:

1. **Explore Features**: Try different AI models, file uploads, and chat features
2. **Configure Endpoints**: Set up additional AI providers in `librechat.yaml`
3. **Customize Theme**: Modify `librechat.yaml` for custom branding
4. **Set Up Production**: Review security settings, generate secure keys, configure HTTPS
5. **Read Documentation**: Visit [https://www.librechat.ai/docs](https://www.librechat.ai/docs) for advanced configuration

---

## Support

If you encounter issues not covered in this guide:

1. Check the [LibreChat Documentation](https://www.librechat.ai/docs)
2. Review Docker logs: `docker logs LibreChat --tail 100`
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
5. Ensure all prerequisites are installed and up to date

---

## Summary

This application is a customized version of LibreChat for the Stanford AI Playground. It includes:

- **Direct Attach Feature**: Upload files directly to models, bypassing RAG
- **Video/Audio Transcription**: Automatic transcript generation using OpenAI Whisper
- **Stanford Theme**: Custom branding and configuration
- **Full LibreChat Features**: All standard LibreChat capabilities

The application runs on **port 3080** by default and requires Docker for all backend services (MongoDB, Meilisearch, VectorDB, RAG API).

---

**Last Updated**: January 2025
**Version**: Based on LibreChat v0.8.2-rc1

