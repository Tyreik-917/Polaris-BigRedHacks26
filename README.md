# Polaris — GPS for your money

Polaris helps college students reach a savings goal with forward-looking ETA, Nessie account data, Grok voice and directions, and a Ursa Minor constellation that lights up as you progress.

Built with **Next.js**, **TypeScript**, **Tailwind**, **shadcn/ui**, **Capital One Nessie**, and **xAI Grok**.

## Production deployment (Vercel)

1. **Push** this repo to GitHub and import it in [Vercel](https://vercel.com).
2. **Environment variables** (Project → Settings → Environment Variables):

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `NESSIE_API_KEY` | Yes (prod) | Server-only; from Nessie profile |
   | `XAI_API_KEY` | Recommended | Voice, directions, Imagine |
   | `NESSIE_CUSTOMER_ID` | Optional | Default customer for single-tenant; users can override in UI |
   | `POLARIS_USE_FIXTURE` | **No** | Keep `false` in production |
   | `XAI_CHAT_MODEL` | Optional | Default `grok-3-mini-fast` |
   | `XAI_IMAGINE_MODEL` | Optional | Default `grok-imagine-image` |

3. **Deploy** — build command `npm run build`, output Next.js default.
4. **Health check** — `GET /api/health` after deploy.
5. **Real users** — each user pastes their **Nessie customer ID** in **Nessie account** (stored in `localStorage` only). Your server holds one Nessie API key; customer IDs scope data per user.

### Privacy

- No database: goals and customer ID stay in the **browser**.
- Nessie and Grok calls run through **your** API routes; keys never ship to the client.
- xAI Voice uses **ephemeral tokens** from `/api/voice`.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Offline demo:

```bash
POLARIS_USE_FIXTURE=true npm run dev
```

## How it works

1. **Demo login** — with `NESSIE_CUSTOMER_ID` or `POLARIS_USE_FIXTURE=true`, judges tap **Continue as Maya (demo)** (no password). Otherwise link a Nessie customer ID in the UI.
2. Set a savings destination (text or Grok Voice).
3. `/api/sync` loads accounts, bills, purchases, deposits, transfers.
4. **TypeScript projection** (`lib/projection`) computes ETA — not the LLM.
5. **Rule-based tips** → Grok turns facts into directions (templates if Grok is down).
6. Constellation progress = savings balance ÷ goal amount (see ETA card).

## Scripts

- `npm run dev` — development
- `npm run build` — production build
- `npm start` — run production server locally
- `npm test` — projection unit tests
- `npx tsx scripts/seed-nessie.ts` — optional Nessie seed (requires env)

## API routes

| Route | Purpose |
|-------|---------|
| `GET /api/sync` | Financial snapshot (header `x-polaris-customer-id`) |
| `POST /api/project` | ETA projection |
| `POST /api/navigate` | Directions |
| `POST /api/chat` | Follow-up Q&A (chat history) |
| `POST /api/imagine` | Destination image |
| `POST /api/voice` | Grok Voice ephemeral token |
| `GET /api/health` | Deploy health |
| `GET /api/config` | Public feature flags |

## Hackathon tracks

Navigation theme, Cap One Nessie, Grok Voice + Imagine, constellation / SpaceX angle, Cursor-built codebase.

## License

MIT
