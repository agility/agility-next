# CLAUDE.md

**Read [AGENTS.md](AGENTS.md) first — it is the canonical guide for this repo.** Everything about
the architecture, commands, conventions, environment variables, in-flight work and known bugs lives
there, and it is kept current. This file holds only the Claude Code–specific notes that do not
belong in a tool-agnostic document.

---

## The short version

`@agility/nextjs` is a published npm library — an integration layer between Next.js and Agility CMS.
There is no app to run and **no test suite** (`npm test` exits 1).

Three things to internalise before you touch anything:

1. **Source is `src/` only.** The `.js` and `.d.ts` files at the repository root are gitignored
   build output that the build moves there from `dist/`. Editing them accomplishes nothing and the
   change cannot be committed. Run `git ls-files` if you are unsure whether a file is real.
2. **`npm run build` is the entire verification story.** It must be clean. Anything beyond that is
   a manual render check.
3. **`npm run clean` runs `git clean -Xf`**, which deletes `node_modules/` along with the build
   output. Only run it when you mean it, and reinstall afterwards.

---

## Working here

**Before starting, read `AGILITYPIC-HANDOFF.md`** (untracked, at the root). It is the active piece
of work, and open PR #33 conflicts with it — see §7 of AGENTS.md.

When you change a component, the thing that matters is **the HTML it emits**. Diff the attributes
and the CDN query strings before and after, because that is what decides the version bump and what
a consuming site will actually notice.

`import React from "react"` in every `.tsx`. The classic JSX runtime is configured; without the
import you get a runtime error, not a compile error.

## Reporting

Do not describe a change as tested. State what you ran — realistically `npm run build` — and what
you only reasoned about. If you could not verify something, say which part and why; the §8 "known
rough edges" list in AGENTS.md exists because several long-standing bugs were smoothed over rather
than flagged.
