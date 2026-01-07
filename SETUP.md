# Setup Guide for Stanford AI Playground

This guide will help you set up the Stanford AI Playground after cloning the repository.

## Quick Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Add these to your `.env` file (create it if it doesn't exist):
   ```env
   # Allow unverified email login (required for new users to sign in)
   ALLOW_UNVERIFIED_EMAIL_LOGIN=true
   
   # Allow user registration
   ALLOW_REGISTRATION=true
   ```

3. **Clear Cache** (important for Stanford theme to load)
   ```bash
   npm run flush-cache
   ```

4. **Build Frontend**
   ```bash
   npm run frontend
   ```

5. **Start Docker Services**
   ```bash
   docker compose up -d
   ```

6. **Restart API** (to pick up new config)
   ```bash
   docker compose restart api
   ```

## Why These Steps Are Needed

### Stanford Theme
- The `librechat.yaml` file contains the Stanford theme configuration
- The startup config is cached, so you need to clear the cache after cloning
- After clearing cache, the Stanford theme will be detected from `customWelcome: 'Welcome to the Stanford AI Playground'`

### User Login/Registration
- New users are created with `emailVerified: false` by default
- Without `ALLOW_UNVERIFIED_EMAIL_LOGIN=true`, only verified users can log in
- Setting this to `true` allows all users to log in regardless of verification status

## Troubleshooting

### Stanford Theme Not Showing
1. Verify `librechat.yaml` exists in the repo root
2. Clear cache: `npm run flush-cache`
3. Restart API: `docker compose restart api`
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Users Can't Sign In
1. Check `.env` has `ALLOW_UNVERIFIED_EMAIL_LOGIN=true`
2. Restart API: `docker compose restart api`
3. Check API logs: `docker compose logs api --tail 50`

### Users Can't Register
1. Check `.env` has `ALLOW_REGISTRATION=true`
2. Verify LDAP is not enabled (LDAP disables registration)
3. Restart API: `docker compose restart api`

