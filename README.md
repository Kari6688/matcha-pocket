# Matcha Pocket

A matcha spots map and tin collection app, built with **React + Vite + TypeScript**.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

Other scripts:

- `npm run build` — type-check + production build into `dist/`
- `npm run preview` — serve the production build locally

## Live

https://matcha-pocket.vercel.app

## Notes

- Auth is via Supabase (Google, Apple, email magic link). Guests can browse the map; saving spots and the collection requires sign-in.
- See `.env.example` for required environment variables.
