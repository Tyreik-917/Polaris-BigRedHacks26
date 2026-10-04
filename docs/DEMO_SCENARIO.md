# Storyboard demo — Save $1,000 by December 10

This walkthrough matches the **Polaris demo scenario** storyboard: login → spoken goal → Capital One check-in → star route → tap stars → reroute on new money.

## One-time setup

In `.env.local`:

```env
POLARIS_USE_FIXTURE=true
NEXT_PUBLIC_USE_FIXTURES=true
NEXT_PUBLIC_DEMO_MODE=true
DEMO_MODE=true
```

Optional overrides (defaults match the hackathon account):

```env
DEMO_LOGIN_EMAIL=tyreikr11@cornell.edu
DEMO_LOGIN_PASSWORD=your_password_here
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Act 1 — Set a goal

1. **Log in** with your demo email and password.
2. You land on **Set a destination**; the app sends: *“I want to save $1,000 by December 10th.”*
3. Polaris replies and opens the **goal summary** with:
   - Checking **$612.40**, Savings **$112.00**
   - Bills before Dec 10 **$1,035**, Food **$45 / wk**
   - Paydays **every other Fri**, **$380** each
   - **ETA Jan 6** — **27 days late**
4. Tap **Show my star route**.

## Act 2 — Star route

- Map labels: **You · Oct 3**, **Payday · Oct 10**, **Phone bill · Oct 12**, **Rent · Nov 5**, **Payday · Nov 21**, goal **$1,000 · Dec 10**.
- Tap any star for **coming in**, **due before the next star**, and a **showcase image** for that checkpoint (Grok Imagine in production).

## Act 3 — Tap a star

Example: **Payday · Nov 21** (checkpoint 4 of 4) — paycheck +$380, Spotify/groceries due, **$540 of $1,000** saved by that star.

## Act 4 — Reroute on new money

On the route page, type or say:

> I made $85 in tips at work tonight!

Polaris will:

1. Show **Capital One account updated** (+$85 to checking).
2. Draw a **new gold route**; the **previous path turns grey**.
3. Update **ETA Jan 6 → Dec 28** (**9 days sooner**), **Saved $197 / $1,000**.

## Demo controls (optional)

With `DEMO_MODE=true`, triple-press **D** or tap the header avatar to open **Demo controls** (tips, Chipotle purchase, Sam paid $25, reset).

## Live Nessie instead of fixtures

Run `npm run demo:nessie`, set `NESSIE_CUSTOMER_ID`, turn off `POLARIS_USE_FIXTURE` / `NEXT_PUBLIC_USE_FIXTURES`, and keep the same login. Numbers come from your seeded customer; the UI flow is unchanged.
