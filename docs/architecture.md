# Architecture

How `@agility/nextjs` is put together, and how a request becomes a rendered page.

---

## The shape of the package

This is an integration layer, not a client. Networking, retries and response shaping all belong to
`@agility/content-fetch`, which is a **peer dependency** — the consuming app installs it, and this
package calls into whatever version is there.

```
        Consuming Next.js app
                 │
                 ├── @agility/nextjs        ── components, types, helpers
                 │                              (ContentZone, AgilityPic, AgilityImage,
                 │                               handlePreview, renderHTML, expand*)
                 │
                 └── @agility/nextjs/node   ── server data layer
                            │                   (getAgilityPageProps, getAgilityPaths,
                            │                    getDynamicPageURL, preview key functions)
                            │
                            ▼
                  @agility/content-fetch   ── the REST client (peer dep)
                            │
                            ▼
                     Agility CMS API
```

### Why the build output lands at the repository root

`package.json` declares `"main": "index.js"` and has **no `exports` map**. The subpath
`@agility/nextjs/node` therefore resolves by plain file lookup: Node looks for `node.js` at the
package root. That constraint drives the whole build:

```
tsc                          → compiles src/ into dist/
shx mv ./dist/* ./           → moves the output to the package root
shx rm -rf ./dist            → removes the now-empty dist/
```

`.npmignore` excludes `src/`, so the published tarball contains only the compiled root files.
`.gitignore` ignores `*.js` and `*.d.ts` (with `!src/*.js` to keep the two hand-written JavaScript
files tracked), so that same output is invisible to git.

The consequence worth remembering: **the repo root is a working directory full of generated files
that look like source.** Adding an `exports` map would let the package ship a `dist/` folder
instead, but it is a coordinated change — layout and resolution have to move together.

---

## The two entry points

| | `@agility/nextjs` | `@agility/nextjs/node` |
|---|---|---|
| Source | `src/index.ts` | `src/node.ts` |
| Contents | Components, types, config, browser + utility helpers | Data fetching, preview keys |
| Environment | Anywhere | **Server only** |
| Why | — | Uses `crypto` and reads `process.env` |

`src/index.ts` is a barrel that re-exports `types`, `config`, `ContentZone`, `AgilityImage`,
`AgilityPic`, `browser` and `utils`.

Note that `node.ts` is deliberately **not** in that barrel. Importing the server layer from the
main entry point would drag `crypto` into client bundles.

---

## Configuration

[`src/config.ts`](../src/config.ts) is eight lines and one exported object:

```ts
export let agilityConfig = {
  guid: process.env.AGILITY_GUID,
  fetchAPIKey: process.env.AGILITY_API_FETCH_KEY,
  previewAPIKey: process.env.AGILITY_API_PREVIEW_KEY,
  locales: (process.env.AGILITY_LOCALES || "en-us").split(","),
  channelName: process.env.AGILITY_SITEMAP || "website",
  securityKey: process.env.AGILITY_SECURITY_KEY,
  debug: process.env.AGILITY_DEBUG === "true",
  defaultCacheDuration: process.env.AGILITY_FETCH_CACHE_DURATION
    ? parseInt(process.env.AGILITY_FETCH_CACHE_DURATION) : 60,
}
```

**This is evaluated once, at module load.** `node.ts` then captures `securityKey`, `channelName`
and `cacheDuration` into module-level constants at *its* load time. Mutating `process.env` later
changes nothing. Anything that must vary per request has to arrive as a function argument — which
is exactly what open PR #10 (optional per-call channel name) is about.

---

## Request flow: `getAgilityPageProps`

The core function, ~270 lines in [`src/node.ts`](../src/node.ts). In order:

1. **Resolve the locale** — `locale || defaultLocale || agilityConfig.locales[0]`, lowercased.
2. **Build the path** from `params.slug`, handling both the string and string-array forms.
3. **Decide preview mode** — `preview || NODE_ENV === "development"`. Development is always preview.
4. **Create a REST client** via `agilityRestAPI.getApi(...)`, keyed with the preview or fetch API
   key depending on step 3.
5. **Set cache options for the sitemap fetch** by mutating `agilityRestClient.config.fetchConfig`
   (see *Caching* below).
6. **Fetch the flat sitemap** for the channel and locale. No sitemap → `notFound`.
7. **Fire the `onSitemapRetrieved` callback** if the consumer supplied one in `apiOptions`.
8. **Look up the page in the sitemap.**
   - For `/`, it takes `Object.keys(sitemap)[0]` — **the first key**, not an explicit home lookup.
     This is positional and fragile; see AGENTS.md §8.
   - Otherwise, a direct `sitemap[path]` lookup.
9. **Re-set cache options**, now tagged for this specific page, then **fetch the page**.
10. **Resolve global data** — for each entry in `globalComponents` with a `getCustomInitialProps`,
    call it and collect the result into `globalData[key]`. Errors are re-thrown wrapped.
11. **Fetch the dynamic page item** when `sitemapNode.contentID > 0`.
12. **Derive the template name** — `page.templateName` with all non-alphanumerics stripped.
13. **Walk every content zone**, and for each module whose component exposes
    `getCustomInitialProps`, call it and attach the result as `customData`. This is what makes
    per-module data available at static-generation time.
14. **Return** `AgilityPageProps`.

Steps 10 and 13 are the extension points. Everything else is plumbing.

### `getAgilityPaths`

Iterates the configured locales, fetches each flat sitemap, and returns every path that is neither
a redirect nor a folder. Non-default locales are prefixed with `/{languageCode}`.

### `getDynamicPageURL`

Fetches the flat sitemap and returns the first path whose `contentID` matches. Used to turn a
content item into the URL of the dynamic page that renders it.

---

## Caching

Cache behaviour is set by **mutating the REST client's `fetchConfig` immediately before each call** —
there is no per-call cache argument in the SDK, so the client is reconfigured in place.

```ts
if (cacheDuration > 0) {
  agilityRestClient.config.fetchConfig = {
    next: { tags: [`agility-page-${pageID}-${languageCode}`], revalidate: cacheDuration },
  }
} else {
  agilityRestClient.config.fetchConfig = { cache: "no-store" }
}
```

Two tag families are emitted:

| Tag | Applied to |
|---|---|
| `agility-sitemap-flat-{languageCode}` | Flat sitemap fetches, in all three functions |
| `agility-page-{pageID}-{languageCode}` | The page fetch |

A consuming app can call Next's `revalidateTag` with either to invalidate precisely. Setting
`AGILITY_FETCH_CACHE_DURATION=0` switches everything to `cache: "no-store"` — right for preview
deployments, expensive for production.

Because the client is a shared mutable object, the ordering matters: the sitemap tag is set, the
sitemap is fetched, then the page tag overwrites it before the page fetch. Inserting a fetch
between those points without re-setting `fetchConfig` would pick up the wrong tags.

---

## Rendering: `ContentZone`

[`src/ContentZone.tsx`](../src/ContentZone.tsx) reads `page.zones[name]` and maps each module to a
component:

1. Determine the module name — `m.module`, falling back to
   `item.properties.definitionName` (which is how App Router / newer API responses identify it).
2. Ask the consumer's `getModule(moduleName)` for a component.
3. Render it with the standard prop bundle: `page`, `sitemapNode`, `dynamicPageItem`, `module`,
   `languageCode`, `channelName`, `customData`, `isDevelopmentMode`, `isPreview`, `globalData`.

When no component is found the behaviour is deliberately split: a **visible placeholder** in
preview or development, and a **thrown error** in production. A missing component fails the build
rather than silently shipping a hole in the page.

---

## Images

Two components with genuinely different trade-offs.

### `AgilityPic` — the server-friendly one

Emits a raw `<picture>`: one `<source>` per entry in `sources`, then an `<img>` fallback. Each
`srcSet` is the asset URL plus `?format=auto` and the requested `w`/`h`. Width-only and height-only
sources are clamped to the asset's native dimensions so the CDN is never asked to upscale.

No `"use client"`, no `next/image` — so it renders in a Server Component and the emitted markup is
entirely predictable.

### `AgilityImage` — the `next/image` one

A wrapper that supplies a loader translating `next/image`'s `(src, width, quality)` into Agility CDN
parameters, clamping the requested width to the declared `width` prop and skipping `format=auto`
for SVGs.

It is marked **`"use client"`**, which in the App Router means it can only be used from a client
component. That single line is the main reason to prefer `AgilityPic`.

See AGENTS.md §8 for the current SVG-handling defects in both components.

---

## Preview

Three pieces, split across the client/server boundary:

1. **`handlePreview()`** (client, [`src/browser.js`](../src/browser.js)) — looks for the
   `agilitypreviewkey` query parameter that Agility appends. If present, it strips Agility's own
   parameters (`agilitypreviewkey`, `agilityts`, `AgilityChannelID`), preserves the rest of the
   query string, and redirects to the preview API route after a 2.5-second delay.
2. **`generatePreviewKey()`** (server) — builds the string `-1_{securityKey}_Preview`, expands it to
   UTF-16LE-style bytes (each character followed by a null byte), hashes it with SHA-512 and
   base64-encodes the result.
3. **`validatePreview({ agilityPreviewKey, slug })`** (server) — normalises spaces back to `+`
   (they are lost in URL decoding) and compares against `generatePreviewKey()`.

The consuming app supplies the API route that ties them together and enables Next's draft mode.

---

## Type system

[`src/types.ts`](../src/types.ts) is the real API contract. The important families:

- **Page data** — `AgilityPageProps`, `AgilitySitemapNode`, `AgilityGetStaticPropsContext`
- **Module components** — `Module<T>`, `ModuleWithInit<TProps, TInit>`, `ModuleWithDynamic`,
  `UnloadedModule`; and their props: `ModuleProps<T>`, `DynamicModuleProps<T, D>`,
  `CustomInitProps<T, C>`
- **Data-loading callbacks** — `CustomInitPropsArg`, `GlobalCustomInitPropsArg`, `ComponentWithInit`
- **Fields** — `ImageField`, `URLField`, `Properties`
- **Options** — `ApiOptions`, `IGetDynamicPageURLProps`

`ContentItem` and `ApiClientInstance` are re-exported from `@agility/content-fetch` so consumers do
not need a direct import for the common cases.

`AgilityGetStaticPropsContext` still extends Next's **`GetStaticPropsContext`**, a Pages Router
type, even though the package targets the App Router. It works because the fields used are generic,
but it is a historical seam worth knowing about.
