# Social Auth Integration Status

This status matrix documents the completion level, configuration endpoints, and properties of the authentication system.

---

## 1. Overall Completion Matrix

| Module | Status | Tested | Notes |
|---|---|---|---|
| **Database Schema** | 100% | Yes | `OAuthAccount` table created; `User.passwordHash` optional. |
| **Prisma Client** | 100% | Yes | Client generated successfully. |
| **Session Middleware** | 100% | Yes | `express-session` integrated securely in NestJS. |
| **Google Strategy** | 100% | Yes | Mapped `email`, `name`, `avatarUrl`, `providerAccountId`. |
| **Microsoft Strategy** | 100% | Yes | Mapped profile information, user principal name. |
| **GitHub Strategy** | 100% | Yes | Mapped username, user emails, and profile picture. |
| **Facebook Strategy** | Disabled | - | Temporarily removed for maintenance. |
| **Twitter/X Strategy** | Disabled | - | Temporarily removed for maintenance. |
| **Account Linking** | 100% | Yes | Automatic mapping to existing emails. |
| **Frontend UI Buttons** | 100% | Yes | Adjusted to show Google/Microsoft/GitHub buttons. |
| **Frontend Callback** | 100% | Yes | Implemented secure profile hydration page with Suspense. |
| **Frontend Error UI** | 100% | Yes | Dedicated error boundary page with recovery route. |

---

## 2. API Endpoint Matrix

| Action | Endpoint | Method | Guard | Success Redirect |
|---|---|---|---|---|
| **Local Login** | `/api/v1/auth/login` | `POST` | `Throttle` | Returns JSON & Sets cookies |
| **Google Init** | `/api/v1/auth/google` | `GET` | `GoogleOauthGuard` | Google Consent Screen |
| **Google Callback** | `/api/v1/auth/google/callback` | `GET` | `GoogleOauthGuard` | `/auth/callback?status=success` |
| **Microsoft Init** | `/api/v1/auth/microsoft` | `GET` | `MicrosoftOauthGuard` | Microsoft Login Page |
| **Microsoft Callback**| `/api/v1/auth/microsoft/callback` | `GET` | `MicrosoftOauthGuard` | `/auth/callback?status=success` |
| **GitHub Init** | `/api/v1/auth/github` | `GET` | `GitHubOauthGuard` | GitHub Consent Screen |
| **GitHub Callback** | `/api/v1/auth/github/callback` | `GET` | `GitHubOauthGuard` | `/auth/callback?status=success` |
| ~~**Facebook Init**~~ | *Disabled* | `GET` | - | - |
| ~~**Facebook Callback**~~ | *Disabled* | `GET` | - | - |
| ~~**Twitter Init**~~ | *Disabled* | `GET` | - | - |
| ~~**Twitter Callback**~~ | *Disabled* | `GET` | - | - |

---

## 3. Account Data Mapping

All active strategies map their raw profile objects into the following schema matching the `validateOAuthUser` inputs:

```typescript
interface OAuthUserPayload {
  email: string;             // anchor identity
  name: string;              // formatted user name
  avatarUrl: string | null;  // mapped from profile picture
  provider: string;          // "google" | "microsoft" | "github" (facebook/twitter disabled)
  providerAccountId: string; // unique ID returned by provider
}
```

---

## 4. Verification Check

- **Backend compilation:** `npm run build` exits `0`.
- **Frontend compilation:** `npm run build` exits `0` (Success, no CSR/bailout Suspense warnings).
- **Session handling:** Cookies (`accessToken`, `refreshToken`) set successfully inside the callback redirect.
