# Polaris — BigRed Hacks 2026

**Polaris** is a voice-guided app that helps college students reach a money goal — like GPS for finances. Set a destination, sync [Capital One Nessie](http://api.nessieisreal.com/) data, get an ETA and turn-by-turn directions (Grok), and watch **Ursa Minor** light up as you progress.

Built with **Cursor**, **Next.js**, **TypeScript**, **Tailwind**, **shadcn/ui**, **Nessie**, **Grok Voice Agent**, and **Grok Imagine**.

## How it works

1. **Destination** — voice (Grok Voice Agent) or text goal with amount + date (stored in `localStorage`, no database).
2. **Where you are** — `/api/sync` pulls accounts, bills, purchases, deposits, transfers from Nessie.
3. **Route** — deterministic TypeScript projection (`lib/projection`) computes ETA from savings balance, paychecks, bills, and average daily spend.
4. **Directions** — rule-based facts → Grok narrates; templates fallback if API is down.
5. **Constellation** — real star positions (Ursa Minor / Polaris) map to progress %.

**Progress baseline:** current saved = Nessie **savings account balance** toward the goal target.

## Quick start

```bash
cp .env.example .env.local
# Add NESSIE_API_KEY, NESSIE_CUSTOMER_ID, XAI_API_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo without Nessie

```bash
POLARIS_USE_FIXTURE=true npm run dev
```

Uses `fixtures/demo-snapshot.json`.

### Optional Nessie seed

```bash
export $(grep -v '^#' .env.local | xargs)
npx tsx scripts/seed-nessie.ts
```

## Environment

| Variable | Purpose |
|----------|---------|
| `NESSIE_API_KEY` | Nessie query param |
| `NESSIE_CUSTOMER_ID` | Hackathon customer id |
| `XAI_API_KEY` | Grok chat, Voice Agent, Imagine |
| `POLARIS_USE_FIXTURE` | `true` → offline fixture |

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm test` — projection unit tests (Vitest)

## Judge demo flow (~90s)

1. Show dim constellation → set goal (“$400 flight home by Dec 15”).
2. Imagine postcard (blurred → sharp as progress grows).
3. ETA card — on time or days late.
4. Turn-by-turn directions + Voice readout.
5. **Reroute** — refresh Nessie, toast “Rerouting…”, updated ETA.

## Project structure

- `app/api/*` — Nessie sync, projection, navigate, imagine, voice token
- `lib/projection` — ETA math (not LLM)
- `lib/advice` — tip rules
- `lib/grok` — narration, imagine, voice session helpers
- `components/` — constellation SVG, dashboard, voice UI

## Hackathon requirements

- **Nessie** — accounts, bills, purchases, transfers
- **Cursor** — primary IDE for this repo
- **Grok Voice + Imagine** — voice goal/directions + destination postcard
- **Theme: Navigation** — ETA, reroute, GPS metaphor

## License

MIT (hackathon project)
