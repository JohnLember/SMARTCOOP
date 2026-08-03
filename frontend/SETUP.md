# Frontend Setup

React 19 + Vite + Tailwind v4 SPA for SMARTCOOP.

## Requirements

- **Node.js 20+**
- The backend running first — see `../backend/SETUP.md`

## 1. Configure `.env`

Create `.env` in this folder if it isn't there:

```
VITE_API_URL=http://localhost:4000/api
```

Must match the backend's `PORT`, and the backend's `CORS_ORIGIN` must list this
app's URL (`http://localhost:5173`).

## 2. Install and run

```sh
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a seeded account (`admin` /
`admin123` — full list in `../backend/SETUP.md`).

## Other commands

```sh
npm run build      # production bundle into dist/
npm run preview    # serve dist/ locally to check the build
npm run lint
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Network Error` on login | Backend isn't running, or `VITE_API_URL` is wrong |
| CORS error in the console | Add this origin to `CORS_ORIGIN` in `backend/.env`, restart the API |
| `.env` change had no effect | Vite reads it at startup — restart `npm run dev` |
| Kicked to `/login` immediately | Token expired or `JWT_SECRET` changed — sign in again |
| Port 5173 in use | Vite picks the next free port; update `CORS_ORIGIN` to match |
