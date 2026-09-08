# mise

A private household meal planner: recipes, the weekly plan, a shopping list
that builds itself from the plan, and (later) the pantry.

Mobile-first. The shopping list is used one-handed in a supermarket aisle;
the weekly plan is checked on a phone in the kitchen. Desktop is secondary.

---

## Running it

Requires Node 22+ and a Postgres database (Supabase free tier is fine).

### Local Postgres (development)

```bash
npm install                  # also runs `prisma generate` via postinstall
docker compose up -d         # Postgres on :5432, data in a named volume
cp .env.local.example .env   # connection strings already filled in
npm run db:push              # create the tables
npm run db:seed              # 140 canonical ingredients, 249 alias keys
npm run dev                  # http://localhost:3000
```

`docker compose down` stops the database and keeps the data. `docker compose
down -v` deletes the data too.

### Supabase (when moving off this machine)

Same steps, but instead of `docker compose up`, copy `.env.example` to `.env`
and fill in the two Supabase connection strings — the transaction pooler
(port 6543, with `?pgbouncer=true`) for `DATABASE_URL`, and the direct
connection (port 5432) for `DIRECT_URL`. `.env.example` explains which is
which.

**On Windows, create `.env` in your editor, not with `>` in PowerShell.**
Windows PowerShell 5.1 writes UTF-16 when you redirect to a file, and the
dotenv parser reads that as garbage — you get "Environment variable not found"
even though the file plainly contains it.

**Use `.env`, not `.env.local`.** Next.js reads both, but the Prisma CLI only
reads `.env` — put the connection strings in `.env.local` and `db:push` will
report `Environment variable not found: DATABASE_URL` while the app itself
works. One `.env` file avoids the split. It is gitignored.

If you ever see *"@prisma/client did not initialize yet"*, the generated
client is missing — run `npx prisma generate`. `postinstall` normally handles
this, but it is skipped by `npm ci --ignore-scripts` and by some corporate npm
configs.

For your wife's actual use, run a production build — `next dev` recompiles on
every navigation and is noticeably slow on a phone:

```bash
npm run build && npm start
```

Both `dev` and `start` bind to `0.0.0.0` so other devices on the tailnet can
reach them. **Allow the port through Windows Firewall** — everything looks
correct but the phone cannot connect, and this is the standard first-time
trip-up.

## Checks

```bash
npm test          # 47 unit tests: units, consolidation, weeks, alias keys
npm run typecheck
npm run build
```

## Claude smoke test

Before building on the AI features, confirm the Agent SDK works on this
machine:

```bash
curl http://localhost:3000/api/claude/smoke
```

A healthy response reports `"status": "ok"` and, importantly,
`"meteredBillingActive": false`. **If that field is ever `true`,
`ANTHROPIC_API_KEY` has leaked into the environment and calls are being billed
per token instead of using the subscription.** Not even a blank
`ANTHROPIC_API_KEY=` line belongs in `.env` — an empty string still shadows
the OAuth credentials.

## Access from her phone

The app must be served over HTTPS, not `http://100.x.x.x:3000`. Plain HTTP on
a non-localhost origin is not a browser "secure context", which rules out
service workers and therefore the offline shopping list.

```bash
tailscale funnel 3000     # public URL, behind the app's own auth
# or
tailscale serve 3000      # private to the tailnet, needs the VPN active
```

Set `AUTH_URL` to that hostname or auth callbacks fail confusingly.

Then, on her iPhone: open it **in Safari** and use **Add to Home Screen** —
not a bookmark, and not Chrome. Safari evicts script-writable storage after
seven days without a visit, which is exactly the cadence of a weekly meal
planner; installed web apps are exempt from that eviction.

---

## How it is put together

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma · PostgreSQL

It runs as a real long-lived Node process, not on serverless. That is a
requirement, not a preference: the Claude Agent SDK extracts a bundled binary
and spawns it as a subprocess, which serverless platforms cannot do.

| Path | What lives there |
|---|---|
| `src/lib/units.ts` | Unit conversion, including the AU/US tablespoon problem |
| `src/lib/consolidate.ts` | Shopping list consolidation — the four steps |
| `src/lib/alias-key.ts` | Raw ingredient string → lookup key (pure, tested) |
| `src/lib/canonical.ts` | Alias cache; asks Claude only on a genuine miss |
| `src/lib/week.ts` | Sunday-start week arithmetic, no scheduled job |
| `src/lib/claude/` | Agent SDK wrapper, auth detection, billing guard |
| `src/data/canonical-ingredients.json` | Reference data, versioned in git |

### Three rules the code is built around

**Claude never does arithmetic.** It extracts structure — `"2"`, `"tbsp"`,
`"olive oil"` — and code does the maths. A wrong quantity is a bad shop.

**The alias table is a write-through cache.** The first sighting of an
ingredient string may cost a Claude call; every sighting after that is a
database lookup. Without the write-back the whole design is pointless.

**Every Claude-backed feature degrades.** Import fails → the manual form,
pre-filled with whatever was extractable. Canonicalisation fails → the raw
string goes on the list anyway. Food never silently vanishes because an API
call did.

### The Australian tablespoon

An Australian tablespoon is 20ml. Almost every imported US or UK recipe means
15ml. A teaspoon is 5ml everywhere; an AU/UK cup is 250ml, a US cup 240ml.

Every recipe stores its origin country, and conversion uses it. Get this wrong
and you are quietly a third over on every tablespoon in the book. There are
tests for it.

### Consolidation

You can add 200g onion to 300g onion. You cannot add "2 onions" to "150g
onion" — so the list shows **Onion — 2 whole + 150g** rather than inventing a
number. Salt, pepper and cooking oil become plain check-items with no
quantity at all.

The shopping list is *derived from the plan on read*, not accumulated as
meals are added. That makes "removing a recipe removes its ingredients" true
by construction rather than by remembering to write the delete path — the
single easiest thing to get wrong in this feature.

## Build order

- **Phase 1 — the core loop.** Manual entry, recipe list, weekly plan,
  shopping list. *This is what is built.* Get it into real weekly use before
  adding anything else.
- **Phase 2 — the time-savers.** URL import (JSON-LD first, Claude only on a
  miss), auto-tagging, duplicate detection, share/export.
- **Phase 3 — the inventory.** Pantry, shopping deduction, cook-from-what-I-have.
  The schema is already shaped for it; the feature waits.
- **Phase 4 — the polish.** Suggest-a-week, leftovers, week archive and copy.
