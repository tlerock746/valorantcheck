# Valorant Toolkit — Vercel-ready starter

## Deploy
1. Upload the contents of this folder to a private GitHub repository.
2. Import the repository at https://vercel.com/new.
3. Framework Preset: Other. No build command is required. Deploy.
4. Test `/`, `/maker`, and `/store`.

## Important limitations
- The Riot Client local connection (`127.0.0.1` / Windows lockfile) cannot work from a Vercel serverless function. `/api/me` and `/api/store` intentionally return an explanation.
- The hosted version uses the existing Riot web-login URL flow through `/api/url` and `/api/store-url`. Riot endpoints used here are not an official public API contract and can change or reject requests; test with your own account before sharing publicly.
- Never ask users to send passwords or MFA codes to your site. The current flow handles a short-lived access token from the URL; it is processed in memory for the request and not stored by this project. Avoid screenshots, analytics, or logs containing the URL/token.
- Because this is public-facing and the Riot API is undocumented, add proper abuse protection/rate limiting and review Riot's current terms before promoting it. Vercel Functions do not share an in-memory rate-limit counter across instances.
- No API key or Riot credentials should be added to GitHub or Vercel environment variables for this flow.

## Files
- `index.html`: landing page
- `maker.html`: ID Maker
- `store.html`: store page
- `api/url.js`: inventory API
- `api/store-url.js`: store API
- `api/me.js`, `api/store.js`: local-client endpoints that are unavailable on Vercel
- `lib/riot.js`: Riot request logic adapted from the supplied `server.js`
- `lib/handler.js`: request validation and response handling
