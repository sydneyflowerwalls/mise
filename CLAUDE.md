# mise — working notes

Private household meal planner. Mobile-first: design at 375px, the shopping
list is used one-handed in a supermarket aisle.

## Hard constraints

**Never set `ANTHROPIC_API_KEY` anywhere in this project.** Not in `.env`, not
in `.env.example`, not even blank. The Agent SDK prefers an API key if it sees
one and silently switches to metered billing. An empty value becomes `""` in
`process.env` and still shadows the OAuth credentials. `src/lib/claude/env.ts`
defends against this; import it at every Claude call site.

**This app runs as a long-lived Node process.** The Agent SDK spawns a bundled
binary as a subprocess. Do not propose Vercel, Netlify or Cloudflare Workers —
they cannot run it. Routes calling Claude need `export const runtime = "nodejs"`
and `export const dynamic = "force-dynamic"`.

**Claude never does arithmetic.** It extracts structure; code does maths.
Unit conversion, quantity scaling, list consolidation, speed tags and
duplicate detection are all pure code with tests. No exceptions.

**Every Claude call needs a working fallback.** Never a hanging spinner, never
a silent failure. Auth problems say so specifically and name the fix.

## Where Claude belongs

| Task | Approach |
|---|---|
| URL import | JSON-LD first, free. Claude only when missing or incomplete |
| Paste raw text | Claude one-shot (`src/lib/claude/one-shot.ts`) |
| Ingredient canonicalisation | Alias table first; Claude on miss, then **write back** |
| Auto-tag cuisine / protein | Claude one-shot at import, stored on the recipe |
| Speed tag | Arithmetic on prep + cook. No LLM |
| Duplicate detection | Trigram similarity in Postgres. No LLM |
| Unit conversion | Pure code. No LLM, ever |
| Shopping consolidation | Pure code |
| Suggest-a-week | Agentic, once a week |

## Conventions

- Quantities are `Decimal` in the schema and never `Float`.
- Tag facets are enums, not free strings.
- Import casing must match filenames exactly — Windows is case-insensitive,
  the eventual Linux host is not, and a mismatch builds here and fails there.
- Use `path.join`, never string-concatenated `\`.
- All config through env vars. No hardcoded hostnames, ports or paths.
- `min-h-[100dvh]`, never `h-screen`.
- No emoji in UI — Lucide icons only. No pure black; charcoal `#222`.
- Run `npm test && npm run typecheck` before committing.
- Environment variables go in `.env`, never `.env.local` — the Prisma CLI
  reads only `.env`, so a split leaves `db:push` and `db:seed` blind.

## Design system

Kawaii Pastel Pop — tokens live in `src/app/globals.css`. Pastel palette,
20/40/60px corner radii, coloured shadows, Varela Round throughout.

One deliberate deviation from the supplied spec: its front matter defines the
primary button as `#FFD1DC` fill with `#B3E5FC` text (~1.1:1 contrast,
unreadable). The same spec's prose says "Primary Button: Accent color fill",
so buttons are `#9D84B6` with `#222` text — 4.85:1, passes AA. Legibility in a
supermarket wins over a token table.
