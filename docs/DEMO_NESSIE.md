# Demo Nessie account for Polaris

Nessie customers are tied to **your** Capital One hackathon API key. Polaris cannot create one without that key on your machine.

## Option A — Create a live demo customer (recommended)

1. Go to [api.nessieisreal.com](http://api.nessieisreal.com), sign in, and copy your **API key**.
2. In `.env.local`:
   ```env
   NESSIE_API_KEY=your_key_here
   ```
3. Run:
   ```bash
   npm run demo:nessie
   ```
4. The script creates **Maya Chen** (demo) with checking + savings, rent/phone bills, paychecks, food purchases, and a P2P receivable — then saves:
   - `NESSIE_CUSTOMER_ID` in `.env.local`
   - `demo-nessie.credentials.json` (gitignored)

5. Start the app: `npm run dev`, log in with **tyreikr11@cornell.edu** / **123456789**, and set a goal like **$400 flight home**.

## Option B — No Nessie key yet (offline)

```bash
POLARIS_USE_FIXTURE=true npm run dev
```

Uses `fixtures/demo-snapshot.json` (same story as the seeded customer).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing Authentication Token` | Check `NESSIE_API_KEY` |
| `Missing or invalid customer ID` in app | Paste customer ID from script output into **Nessie account** |
| Purchase POST fails | Script still creates customer; add purchases in Nessie UI if needed |
