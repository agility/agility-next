# Handoff — porting five `AgilityPic` fixes from the 2026 website

**Written 2026-09-21.** Source of every change below: `src/components/common/agility-pic.tsx` in
`agility-website-nextjs-2026`, a local fork of this component that has been running in production
on the site rebuild. The fixes were made there over several months and never came back upstream.

Nothing on that website depends on the packaged `AgilityPic` — it imports only
`@agility/nextjs/node` — so **this is not a fix for a broken consumer.** It is five improvements
that currently benefit one site and should benefit every customer using the package.

---

## TL;DR

| # | Fix | Severity | Breaking? |
|---|---|---|---|
| 1 | `width`/`height` on the `<img>` — **CLS on every image today** | 🔴 high | ⚠️ yes, visually |
| 2 | SVG bypass — `format=auto` **rasterizes SVGs** | 🔴 high | no |
| 3 | `alt` can be omitted entirely — a11y failure | 🟠 medium | no |
| 4 | hi-DPI `srcSet` (1x/2x), capped at native width | 🟡 low | no |
| 5 | `fetchPriority="high"` when `priority` is set | 🟡 low | no |
| 6 | Null-image guard | 🟡 low | no |

**Fix 2 is the easiest sell:** this exact bug was already fixed in the sibling component,
`AgilityImage.tsx`, in **PR #30 (Feb 2025)** — and `AgilityPic` was missed. The project has
already agreed SVG rasterization is a bug; one of the two components just never got the patch.

**Fix 1 is the one that needs a decision**, not just a review. See *Semver* below.

---

## Current state

`src/AgilityPic.tsx` has two commits ever (`4bf56c3` "next 14 tweaks", `e5685a4` "rc4"). Published
as `@agility/nextjs@16.0.8`. Build is `tsc` + `shx` moving `dist/*` to the package root; there is
**no test script** (`npm test` exits 1), so verification here is manual — see *Verifying* below.

---

## The fixes

### 1. `width`/`height` on the `<img>` — CLS 🔴

**Today** the `<img>` carries no dimensions, so the browser has no aspect ratio before the image
loads and the page reflows when it arrives. That is Cumulative Layout Shift on every image
rendered through this component, on every consuming site.

**The data is already there and already required** — `ImageField` in `src/types.ts` declares
`height: number` and `width: number` (lines 209–216, both non-optional). Nothing new to fetch.

```tsx
let imgHeight: number | undefined = undefined
let imgWidth: number | undefined = undefined

if (fallbackWidth !== undefined && fallbackWidth > 0 && image.width > 0 && image.height > 0) {
  imgWidth = fallbackWidth
  imgHeight = Math.round(fallbackWidth / (image.width / image.height))
}
// …then on the <img>:  width={imgWidth} height={imgHeight}
```

Deliberately scoped to the `fallbackWidth` case: without a `fallbackWidth` the `<img>` renders the
original asset at its own size, and emitting the raw CMS dimensions would be right but is a bigger
behavioural change. Start narrow.

> ⚠️ **This is the change that can move existing layouts.** A site currently relying on the image
> having *no* intrinsic size — sized purely by CSS on a parent — may shift when the `<img>` gains
> one. In most cases the result is *better* (the space is reserved correctly); in some it will be
> visibly different. This is why it wants a minor, not a patch.

### 2. SVG bypass 🔴

`?format=auto` on an SVG asks the CDN to rasterize it. `AgilityImage.tsx:21-22` already guards
this; `AgilityPic.tsx` does not.

```ts
const isSvg = isSvgUrl(image.url)
if (!isSvg && fallbackWidth !== undefined && fallbackWidth > 0) {
  src = `${image.url}?format=auto&w=${fallbackWidth}`
}
// and skip srcSet generation entirely for SVGs
```

The website's helper, worth copying verbatim — it parses rather than string-matches, so a query
string or fragment after `.svg` doesn't defeat it:

```ts
export const isSvgUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    const pathname = new URL(url, "https://example.com").pathname
    return pathname.toLowerCase().endsWith(".svg")
  } catch {
    return url.toLowerCase().includes(".svg")
  }
}
```

Note this is *stricter* than `AgilityImage`'s inline `endsWith(".svg")` on the whole URL, which
misses `logo.svg?v=2`. Consider moving both components onto the shared helper while you are here.

### 3. `alt` can be omitted entirely 🟠

```tsx
alt={alt || image.label}          // today — undefined when both are empty ⇒ NO alt attribute
alt={alt ?? image.label ?? ""}    // fixed
```

An `<img>` with no `alt` attribute at all is an accessibility failure (screen readers fall back to
announcing the filename). An `alt=""` is a valid, meaningful signal: decorative.

The `??` also fixes a second, quieter bug: with `||`, a deliberate `alt=""` for a decorative image
is falsy and silently falls through to `image.label`, so you cannot mark an image decorative
through this component today.

### 4. hi-DPI `srcSet`, capped at native width 🟡

Today each `<source>` gets a single 1x URL, and a `width`-only source can request an image larger
than the original (upscaling — the CDN will serve a blurry enlargement).

The website emits a 1x/2x pair and clamps both to the asset's real dimensions, offering 2x only
when the source is genuinely large enough. Full implementation in the website file; it is the
bulkiest of the five and the least urgent.

### 5 & 6. `fetchPriority` and the null guard 🟡

```tsx
if (!image?.url) return null                          // today: throws on image.url
fetchPriority={priority ? "high" : undefined}         // today: loading="eager" only
```

`priority` already means "this is the LCP image". `loading="eager"` only opts out of lazy-loading;
`fetchPriority="high"` actually promotes it in the browser's queue. Pairing them is the standard
combination and is what `next/image`'s own `priority` prop does.

---

## Semver

**Recommend a minor — `16.1.0` — not a patch.**

Fixes 2–6 are all safely patch-level: strictly-better behaviour, no layout consequences. **Fix 1
is not.** Adding `width`/`height` changes the intrinsic size of an element that previously had
none, and a consumer relying on CSS-only sizing can see a visible difference. Shipping that in a
patch means a `^16.0.8` range upgrades sites silently.

Two clean options:

1. **Minor, all six.** Changelog calls out fix 1 explicitly with a one-line "if your images are
   sized purely by CSS, check them after upgrading."
2. **Patch with 2–6, minor with 1.** Gets the SVG and a11y fixes out immediately with zero risk,
   and lets the CLS fix land on its own where people will read about it.

I'd take option 2 if there is any hesitation — the SVG bug is 19 months old and has no downside to
shipping today.

---

## What NOT to port

The website's fork has drifted for reasons specific to that site. Leave these behind:

- **`AgilityImage` type in place of `ImageField`** — the website made `width`/`height`/`filesize`
  optional to match its own CMS reads. The package's required `ImageField` is correct; don't
  loosen it.
- **The `@/lib/...` import paths.** `isSvgUrl` needs to become a local module or inline helper.
- Anything importing from the website's `lib/` — none of it exists here.

---

## Verifying

There is no test harness (`npm test` exits 1), so this is manual. Minimum bar before publishing:

```bash
npm run build          # tsc must be clean; note it moves dist/* to the package root
```

Then render each case and check the emitted HTML:

| Case | Expect |
|---|---|
| raster + `fallbackWidth` | `<img>` has `width` and `height`, `src` has `?format=auto&w=…` |
| **SVG** + `fallbackWidth` | `src` is the bare `.svg` URL — **no `format=auto`, no `w=`** |
| SVG with `?v=2` after the extension | still bypassed (this is what the parsing helper buys) |
| no `alt`, no `image.label` | `alt=""` present, not a missing attribute |
| `alt=""` passed explicitly | stays `""`, does **not** become the label |
| `priority` | `loading="eager"` **and** `fetchPriority="high"` |
| `image` undefined | renders nothing, does not throw |
| source wider than the asset | `srcSet` clamped to the native width, no 2x beyond it |

A local consumer is the fastest way to eyeball it: `npm pack`, then install the tarball into a
scratch Next app. Note the website repo is **not** a useful test bed — it doesn't import this
component.

---

## Reference

- **Working implementation:** `agility-website-nextjs-2026` →
  `src/components/common/agility-pic.tsx` (and `src/lib/utils/is-svg-url.ts`)
- **The sibling that already has fix 2:** `src/AgilityImage.tsx:21-22`, from PR #30
- **Type with the dimensions fix 1 needs:** `src/types.ts:209-216`

---

# Addendum — tracker cross-reference

**Added 2026-09-21** by sweeping `agility/agility-next` issues and PRs against the six fixes above.

## Do any of the six already have an issue?

**No.** None of the six fixes has a GitHub issue. They are all undocumented in the tracker, so
nothing here can simply be "checked off" — but two of them are already partly in flight in an open
PR, and that is the thing to resolve first.

| # | Fix | Tracker status |
|---|---|---|
| 1 | `width`/`height` (CLS) | No issue. **Open PR #33 narrows the case this fix targets** — see below. |
| 2 | SVG bypass | No issue. Precedent is **PR #30** (merged Feb 2025), which fixed the identical bug in `AgilityImage` only. |
| 3 | `alt` handling | No issue. **PR #33 already does half of it** (`alt ?? image.label`), without the `?? ""` tail. |
| 4 | hi-DPI `srcSet` + clamping | No issue. **PR #33 rewrites this exact code, and breaks it** — see below. |
| 5 | `fetchPriority` | No issue. |
| 6 | Null guard | No issue. |

## ⚠️ PR #33 "Fix fallback width" — open, stale, and in the way

<https://github.com/agility/agility-next/pull/33> — Kevin Tran, 2025-07-10, review requested from
Aaron, never merged. Branch `fix-fallback`, based on **15.0.7** while main is now **16.0.8**.

It touches the same twenty lines as fixes 1, 3 and 4, so it has to be resolved before or with them.

**What it does:**

1. **Changes `fallbackWidth` semantics** — the fallback width is applied *only when there are no
   `sources`. This is the stated purpose of the PR.
2. `alt={alt ?? image.label}` — half of fix 3.
3. Reformats the whole file from tabs to 2-space indentation.

**Why it conflicts with fix 1.** The handoff deliberately scopes `width`/`height` to "the
`fallbackWidth` case". If PR #33 lands, that case shrinks to *images with no sources at all* —
which is the minority of real usage. The CLS fix would then do nothing for the sourced images that
make up most of a page. **Fix 1 needs re-scoping if PR #33 is accepted**, most likely by deriving
the `<img>` dimensions from the asset itself rather than from `fallbackWidth`.

**It also introduces three regressions.** Both versions of the component logic were extracted and
run side by side against the same `ImageField` (1000×600) — these are measured outputs, not a read
of the diff.

**(a) `NaN` in the query string on every single-dimension source.** The clamping branches are
inverted; it clamps the dimension that was *not* supplied, and `parseInt("undefined")` is `NaN`:

```js
if (hasW && !hasH) h = `&h=${Math.min(sourceHeight, image.height)}`;  // sourceHeight is NaN here
if (hasH && !hasW) w = `&w=${Math.min(sourceWidth,  image.width)}`;   // sourceWidth is NaN here
```

```
width-only source     main: ?format=auto&w=800      #33: ?format=auto&w=800&h=NaN
height-only source    main: ?format=auto&h=500      #33: ?format=auto&w=NaN&h=500
```

Sources carrying both a width and a height are unaffected — which is likely why it was not caught.

**(b) The upscale guard no longer works.** Because the clamp moved to the wrong dimension, the
dimension you actually supplied is never capped. A `width: 5000` source against a 1000px asset:

```
main: ?format=auto&w=1000       # clamped to the native width
#33:  ?format=auto&w=5000&h=NaN # asks the CDN to upscale
```

**(c) The `<img>` fallback now serves the full-size original.** This is the PR's stated purpose, but
the effect is worse than what it replaces. When sources are present the `<img>` `src` becomes the
bare asset URL — no `w=`, and **no `format=auto`**, so WebP/AVIF negotiation is lost too:

```
main: https://cdn/img.jpg?format=auto&w=400
#33:  https://cdn/img.jpg
```

Any browser that matches no `<source>` — or does not support `<picture>` — downloads the untouched
original. That undercuts the premise: the `<img>` in a `<picture>` *is* the fallback, so sizing it
is correct, not a bug.

**Verdict: do not merge.** It is also `CONFLICTING` / `DIRTY` against `main` and cannot merge
without a rebase regardless, and its `package.json` would take the version *backwards* from
`16.0.8` to `15.0.8` and restore the "NextJS 14" description.

**Recommendation:**

1. **Take the one unambiguously good line** — `alt={alt ?? image.label}` — into fix 3, extended to
   `alt ?? image.label ?? ""`.
2. **Ask Kevin what the original symptom was.** The premise of the PR (that `fallbackWidth` should
   not apply when sources exist) does not hold up on its own, which suggests he hit a real problem
   whose cause is something else. That diagnosis is worth more than the patch.
3. **Close #33** rather than rebasing it. Rebasing means resolving the same conflict twice and
   carrying the tabs-to-spaces reformat, and the handoff work rewrites these lines anyway.

## Related open issues the handoff should account for

Neither is *about* the six fixes, but both change what the right fix looks like.

### Issue #31 — `ImageField` props conflict with API spec 🔴 contradicts the handoff

<https://github.com/agility/agility-next/issues/31> — Ransom, 2025-06-11, no replies.

A user reports what the API actually returns:

```json
{ "label": null, "target": null, "filesize": 396122,
  "pixelHeight": "304", "pixelWidth": "650", "height": 304, "width": 650 }
```

So `label` and `target` come back **null**, and there are two extra string fields the interface
does not declare.

This cuts directly against the *"What NOT to port"* section above, which says the package's
required `ImageField` is correct and the website fork was wrong to loosen it. On this evidence the
fork was right, at least about `label` and `target`. It also strengthens **fix 3**: if `label` is
routinely `null`, then `alt={alt || image.label}` really does produce an `<img>` with no `alt`
attribute in ordinary use — this is not an edge case.

The good news for **fix 1**: #31 confirms `height` and `width` *are* always returned as numbers, so
the dimensions the CLS fix depends on are genuinely there.

**Suggested amendment:** relax `label` and `target` to `string | null` and add the optional
`pixelHeight` / `pixelWidth` strings, as part of this same piece of work.

### Issue #32 — `AgilityPic` should support gallery image items

<https://github.com/agility/agility-next/issues/32> — Ransom, 2025-06-11, no replies.

Gallery images are a different shape: `mediaID`, `fileName`, no `label`, and dimensions nested as
strings under `metaData.pixelHeight` / `pixelWidth`. The issue proposes a `normalizeImage` type
guard.

Relevant because **fixes 1 and 3 both read fields that gallery images do not have** — `image.width`,
`image.height` and `image.label`. If gallery support is coming, a single internal `normalizeImage`
helper placed *before* those fixes would keep both of them working; adding it afterwards means
touching the same lines a third time.

## Unrelated, but free to close while you are in the tracker

Three open issues appear to have been fixed years ago and never closed. Worth confirming and
clearing out.

| Issue | Claim | Evidence it is fixed |
|---|---|---|
| **#16** `handlePreview()` removes all query strings | bug, assigned to Joel | Fixed by **PR #17**, merged 2023-03-14 — *46 minutes after the issue was opened*. `src/browser.js` now preserves non-Agility params via `URLSearchParams`. |
| **#19** Add `globalData` to `ContentZoneProps` and `ModuleProps` | feature request | Fixed by **PR #20**, merged 2023-05-05. `globalData` is present on `ContentZoneProps`, `ModuleProps`, `UnloadedModuleProps`, `DynamicModuleProps` and `AgilityPageProps` in `src/types.ts` today. |
| **#12** Unable to resolve dependency tree with Next 12+ | peer dep range pinned to `^11.0.0` | Fixed by **PR #15**, merged 2022-11-17, which widened the range. It is `^16.0.10` today. |

**#1 "Needs to be properly documented"** (open since 2021) is addressed by the `README.md` rewrite
and the `docs/` tree added alongside this addendum.
