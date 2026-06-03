# Social OAuth Configuration Guide

This guide explains how to fully configure the Google, Microsoft, and GitHub OAuth credentials in your APEX LUXE environment.

> [!NOTE]
> Facebook OAuth and Twitter/X OAuth are **temporarily disabled** and have been removed from the active OAuth routes and frontend UI.

## 1. Mapped Environment Variables

Add the following variables to your `backend/.env` file. (If left unconfigured, the application falls back to safe mock values to prevent startup crashes).

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:5000/api/v1/auth/microsoft/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/auth/github/callback

# Client Domain Redirect
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=a-secure-random-string-for-session-state-2026
```

---

## 2. Provider Console Settings

### A. Google OAuth 2.0
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and navigate to **APIs & Services > Credentials**.
3. Click **Create Credentials > OAuth client ID**.
4. Select **Web application** as application type.
5. Add Authorized Redirect URI:
   - `http://localhost:5000/api/v1/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**.

### B. Microsoft Azure AD
1. Go to the [Azure Portal](https://portal.azure.com/).
2. Select **Microsoft Entra ID** (formerly Azure Active Directory) > **App registrations > New registration**.
3. Name your app, select **Web** platform, and configure redirect URI:
   - `http://localhost:5000/api/v1/auth/microsoft/callback`
4. Under **Certificates & secrets**, generate a new client secret.
5. Copy the **Application (client) ID** and the **Secret value**.

### C. GitHub OAuth App
1. Log into GitHub and go to **Settings > Developer Settings > OAuth Apps**.
2. Click **New OAuth App**.
3. Set **Homepage URL** to `http://localhost:3000`.
4. Set **Authorization callback URL** to:
   - `http://localhost:5000/api/v1/auth/github/callback`
5. Click **Register application**.
6. Generate a client secret and copy both ID and Secret.

---

## 3. Redirect Flow Summary

1. **Frontend Initiation:** User clicks the social button which triggers `window.location.href = "${API_URL}/auth/google"`.
2. **Consent Redirection:** NestJS interceptor (`AuthGuard`) generates a secure `state` parameter, saves it in cookie/session, and redirects the user to the provider consent page.
3. **Provider Callback:** User consents, and is sent to `GET /auth/google/callback` with code and state parameters.
4. **Backend Cryptographic Validation:** NestJS validates state, exchanges code for access token, parses email/name/avatar, validates/registers user in database, sets signed `accessToken` and `refreshToken` in HttpOnly cookies, and redirects the client to:
   - `http://localhost:3000/auth/callback?status=success`
5. **Frontend Session Hydration:** Next.js mounts `/auth/callback`, fetches `/users/me` from backend, maps the profile object into the Zustand auth store, and redirects the user inside the secure platform dashboard.
