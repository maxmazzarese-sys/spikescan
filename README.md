# SpikeScan

Penny catalyst desk with email/password login and a live **Scan today’s market** button.

The scan pulls Yahoo Finance most-actives, small-cap gainers, and aggressive small caps, keeps names under $5, reads headlines for the leaders, and ranks them.

## Run locally
Open `index.html` or:

```bash
python3 -m http.server 8787
```

Demo login: `analyst@spikescan.io` / `spike2026`

## Vercel
Deploy this repo. `/api/scan` is the server-side scanner. The browser falls back to Yahoo + a public proxy if the API route is missing.
