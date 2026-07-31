# VOD CRM

A small CRM (contacts, companies, deals pipeline, tasks) where every record
is tagged to and scoped by the signed-in **Google account**. There are no
app passwords — sign-in is "Sign in with Google" only, and the backend
verifies the Google-issued ID token before letting a request touch any data.

## How the Google integration works

1. The client loads Google Identity Services (`accounts.google.com/gsi/client`)
   and renders the official "Sign in with Google" button
   (`client/src/components/GoogleSignInButton.jsx`).
2. On success, Google returns a signed **ID token** (`credential`) to the
   browser — never a password.
3. The client posts that credential to `POST /api/auth/google`
   (`server/src/routes/auth.js`).
4. The server verifies the token's signature and audience with
   `google-auth-library` (`server/src/auth.js`), extracting the account's
   stable `sub` (subject) claim, email, name, and picture.
5. The server upserts a local `users` row keyed by `google_sub` and issues
   its own short-lived session JWT in an `httpOnly` cookie.
6. Every CRM table (`contacts`, `companies`, `deals`, `tasks`, `notes`)
   has an `owner_id` column pointing at that user row. Every API route is
   wrapped in `requireAuth` middleware and every SQL statement filters on
   `owner_id = req.user.id` (see `server/src/crudFactory.js`), so one
   Google account can never see or modify another's data.

## Project layout

```
server/   Express API + SQLite (better-sqlite3)
client/   React + Vite SPA (Tailwind CSS)
```

## Setup

### 1. Create a Google OAuth client ID

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Create an **OAuth 2.0 Client ID** of type "Web application".
- Add `http://localhost:5173` (and your production origin) to
  **Authorized JavaScript origins**.
- Copy the generated client ID.

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set the same Google client ID in both `server/.env` (`GOOGLE_CLIENT_ID`) and
`client/.env` (`VITE_GOOGLE_CLIENT_ID`). Set `SESSION_SECRET` in
`server/.env` to a long random string.

### 3. Install and run

```bash
npm install
npm run dev
```

This starts the API on `http://localhost:3001` and the client on
`http://localhost:5173` (Vite proxies `/api` to the server, so cookies work
without cross-origin configuration). Sign in with a Google account to start
using the CRM.

### Production build

```bash
npm run build     # builds client/dist
npm start         # runs the API server (serve client/dist behind your own
                   # static host / reverse proxy, or add static serving to
                   # server/src/index.js)
```

Set `NODE_ENV=production` and a real `CLIENT_ORIGIN` so the session cookie
is issued with `secure: true`.
