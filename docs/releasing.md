# Releasing

Build and publish runbook for `@agility/nextjs`.

---

## How the build works

```bash
npm run build
# tsc && shx mv ./dist/* ./ && shx rm -rf ./dist
```

1. `tsc` compiles `src/` into `dist/` — JavaScript plus `.d.ts` declarations.
2. `shx mv` moves everything from `dist/` to the **package root**.
3. `shx rm -rf` removes the empty `dist/`.

The output must land at the root because `package.json` has no `exports` map — the subpath
`@agility/nextjs/node` resolves by looking for `node.js` there. See
[architecture.md](architecture.md#why-the-build-output-lands-at-the-repository-root).

`.npmignore` excludes `src/`, so the published tarball contains only compiled output plus
`README.md`, `LICENSE` and `package.json`.

### `prepare` runs the build automatically

```json
"prepare": "npm run build"
```

npm runs `prepare` on both `npm install` and `npm publish`. Two consequences:

- A fresh `npm install` leaves build output at the root. That is expected, not a dirty tree — the
  files are gitignored.
- `npm publish` **cannot** publish stale output; it always rebuilds. Still build locally first, so
  you see the errors before the registry does.

### Cleaning

```bash
npm run clean     # git clean -Xf
```

Removes every gitignored file. That is the build output **and `node_modules/`**. Reinstall
afterwards.

---

## Verification

There is no test suite. `npm test` exits 1 by design.

**Automated:** `npm run build` completing with no TypeScript errors. That is the whole automated
bar.

**Manual:** render the affected components and inspect the emitted HTML. For image changes the
things that matter are the attributes on `<img>` / `<source>` and the CDN query strings.

The fastest real-world check is a local consumer:

```bash
npm run build
npm pack                                   # → agility-nextjs-<version>.tgz
cd ../scratch-next-app
npm install ../agility-next/agility-nextjs-<version>.tgz
```

Then exercise the changed surface in a page and read the generated markup. `npm pack` respects
`.npmignore`, so this also confirms the tarball contains what it should:

```bash
npm pack --dry-run      # list the files that would ship, without writing a tarball
```

---

## Choosing a version

**Major = the Next.js major.** `16.x` supports Next 16, `15.x` supports Next 15. Do not bump the
major for a feature; a major bump means the package now targets a new Next.js. A major release
updates `peerDependencies`, `devDependencies` and the `description` field together.

For everything else, semver here is about **consumer-visible rendering**, not just API shape. A
component that emits different HTML can move a live site's layout even though its TypeScript
signature is unchanged.

| Change | Bump |
|---|---|
| New optional prop or export | minor |
| New attributes on emitted HTML (`width`, `height`, `fetchpriority`) | **minor** — can shift layouts |
| Different CDN query strings on `src` / `srcSet` | minor |
| Bug fix with strictly-better output and no layout effect | patch |
| Dependency bumps, security patches | patch |
| Removing or renaming an export, changing a required prop | major |
| Targeting a new Next.js major | major |

The middle rows are the ones that get missed. Anything a `^` range would pull in silently needs to
be something a site can absorb without looking at it.

---

## Publishing

```bash
# 1. Make sure you are on main and up to date
git checkout main && git pull

# 2. Bump the version in package.json
#    (edit by hand, or `npm version <patch|minor|major> --no-git-tag-version`)

# 3. Build and verify
npm run build
npm pack --dry-run          # confirm the file list

# 4. Publish — prepare rebuilds automatically
npm publish

# 5. Tag and push
git tag v16.0.9 && git push origin main --tags
```

For a prerelease, use an explicit tag so it does not become `latest`:

```bash
npm publish --tag rc        # installs only via @agility/nextjs@rc
```

The package has shipped prereleases as `13.5.0-rc3`, `14.0.0-rc1` and similar — keep that
convention.

### After publishing

- Confirm it is live: `npm view @agility/nextjs version`
- Write release notes on the GitHub release covering **what changes in the rendered output**, not
  just the API. If anything can move a layout, say so in one plain line so people upgrading know to
  look.
- Close the issues the release fixes.

---

## Dependency hygiene

`npm audit` currently reports vulnerabilities, all of them in **devDependencies** — the build
toolchain. Production dependencies are clean:

```bash
npm audit --omit=dev     # → found 0 vulnerabilities
```

That distinction matters: nothing in the dev tree ships to consumers, because the published tarball
contains only compiled output. Do not panic-bump the toolchain on the strength of a bare
`npm audit`. Always check `--omit=dev` first and report both numbers.

Two things genuinely need care:

- **TypeScript is pinned to `4.9.3`** while React 19 and Next 16 types are modern. `skipLibCheck`
  masks the friction. Bumping it is a real change that needs a full build and a render check.
- **Peer dependency ranges** (`next`, `@agility/content-fetch`) define compatibility. Widening or
  narrowing them is a release-worthy decision, not a maintenance detail.
