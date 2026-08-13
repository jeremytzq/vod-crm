# VOD CRM

A small CRM (contacts, companies, deals pipeline, tasks) where each Google
account's data lives in **a Google Sheet in that account's own Drive** —
there is no shared database at all. There are no app passwords either:
sign-in is "Sign in with Google" only.

## How the Google integration works

There is no username/password anywhere in this app, and no separate
signup step. The first time an account signs in, the server automatically
creates that account's own CRM spreadsheet in their Drive — the account
*is* the CRM.

1. The login page is a single link to `GET /api/auth/google/redirect`
   (`server/src/routes/auth.js`), which redirects to Google's standard
   OAuth consent screen requesting identity scopes plus
   `drive.file` (create/access files this app creates — nothing else in
   the user's Drive) and `spreadsheets` (read/write cell values).
2. Google redirects back to `GET /api/auth/google/callback` with an
   authorization code. The server exchanges it for tokens and verifies the
   ID token with `google-auth-library` (`server/src/auth.js`), extracting
   the account's stable `sub` (subject) claim, email, name, and picture.
3. Using that same authorized client (acting as the user, not a service
   account — so file storage counts against the *user's* Drive quota, not
   some shared backend's), the server finds or creates a spreadsheet named
   "VOD CRM Data" in the user's Drive (`server/src/sheets.js`), tagged with
   a custom Drive property so it can find the same file again on any
   future login, from any device.
4. The server issues its own short-lived session JWT in an `httpOnly`
   cookie containing the user's profile, the spreadsheet ID, and an
   **encrypted** copy of the Google refresh token (`server/src/crypto.js`).
   There is no server-side database at all — the server is fully
   stateless, which is also what makes it deployable as-is on serverless
   platforms (Vercel, etc.) with no filesystem writes anywhere.
5. Every CRM API route (`server/src/crudFactory.js`, `notes.js`,
   `dashboard.js`) decrypts that refresh token to get a live Google API
   client scoped to the signed-in account, and reads/writes only that
   account's spreadsheet. There's no `owner_id` column to filter on
   because there's nothing to filter — the account boundary *is* the file
   boundary.

## Project layout

```
server/   Express API — no database; reads/writes each user's own Google Sheet
client/   React + Vite SPA (Tailwind CSS)
```

## Setup

### 1. Create a Google OAuth client and enable the right APIs

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Enable the **Google Sheets API** and **Google Drive API** (APIs & Services
  → Library).
- Create an **OAuth 2.0 Client ID** of type "Web application".
- Add `http://localhost:3001/api/auth/google/callback` (and your production
  server origin + `/api/auth/google/callback`) to **Authorized redirect
  URIs**.
- Copy the generated client ID and client secret.
- On the **OAuth consent screen**, add the `.../auth/drive.file` and
  `.../auth/spreadsheets` scopes. These are sensitive scopes: while your
  app is in "Testing" mode, add every Google account that needs to sign in
  as a **test user** — otherwise Google blocks them with an "unverified
  app" warning. Moving to production for arbitrary outside users requires
  passing Google's OAuth verification review.

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and set `SESSION_SECRET`
and `ENCRYPTION_KEY` to two different long random strings. The client needs
no environment variables at all — sign-in is entirely server-driven.

### 3. Install and run

```bash
npm install
npm run dev
```

This starts the API on `http://localhost:3001` and the client on
`http://localhost:5173` (Vite proxies `/api` to the server, so cookies work
without cross-origin configuration). Sign in with a Google account (added
as a test user in step 1) to start using the CRM.

### Production build

```bash
npm run build     # builds client/dist
npm start         # runs the API server (serve client/dist behind your own
                   # static host / reverse proxy, or add static serving to
                   # server/src/index.js)
```

Set `NODE_ENV=production` and real `CLIENT_ORIGIN`/`SERVER_ORIGIN` values so
the session cookie is issued with `secure: true` and the OAuth redirect URI
matches what's registered in Google Cloud Console.

## Trade-offs of using Google Sheets as the database

- Every read is a Google Sheets API call over HTTPS — noticeably slower
  than local SQL, with real rate limits (roughly 100 requests/100s/user).
  Fine for one person's CRM; not built for high write volume.
- No joins/transactions — relations (e.g. a deal's linked contact) are
  resolved by matching IDs in application code, not SQL.
- Each login forces Google's consent screen (`prompt=consent`) so a fresh
  refresh token is always issued, since the server keeps no database to
  store one long-term. This is a deliberate trade: no persistent backend
  state, at the cost of a consent screen on every sign-in.
