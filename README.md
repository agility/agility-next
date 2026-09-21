# @agility/nextjs

[![npm](https://img.shields.io/npm/v/@agility/nextjs.svg)](https://www.npmjs.com/package/@agility/nextjs)
[![license](https://img.shields.io/npm/l/@agility/nextjs.svg)](LICENSE)

Next.js support for [Agility CMS](https://agilitycms.com). Renders Agility pages, content zones and
images in a Next.js app, with preview mode and Next's caching wired up for you.

This package is a **thin integration layer**. All HTTP calls go through the
[`@agility/content-fetch`](https://www.npmjs.com/package/@agility/content-fetch) SDK, which is a
peer dependency. What this package adds is the Next.js-shaped part: page-props resolution, static
path generation, the content-zone renderer, two image components and the preview handshake.

> The `agility` object passed to your data callbacks **is** the `@agility/content-fetch` API client.
> Anything that SDK can do, you can do from inside a `getCustomInitialProps`.

---

## Version compatibility

The major version tracks the Next.js major it supports.

| `@agility/nextjs` | Next.js | React |
|---|---|---|
| `16.x` | 16 | 19 |
| `15.x` | 15 | 18–19 |
| `14.x` | 14 | 18 |
| `13.5.x` | 13 | 18 |

Current release requires `next ^16.0.10` and `@agility/content-fetch ^2.0.11` as peers.

## Install

```bash
npm install @agility/nextjs @agility/content-fetch
```

## Configure

Set these in your app's environment. They are read once, when the module is first imported.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AGILITY_GUID` | yes | — | Your instance GUID |
| `AGILITY_API_FETCH_KEY` | yes | — | Live content API key |
| `AGILITY_API_PREVIEW_KEY` | yes | — | Preview content API key |
| `AGILITY_SECURITY_KEY` | for preview | — | Generates and validates preview keys |
| `AGILITY_LOCALES` | no | `en-us` | Comma-separated locales; the first is the default |
| `AGILITY_SITEMAP` | no | `website` | Channel name |
| `AGILITY_DEBUG` | no | `false` | Set `"true"` for verbose logging |
| `AGILITY_FETCH_CACHE_DURATION` | no | `60` | Cache seconds. **`0` disables caching entirely** (`cache: "no-store"`). |

## Two entry points

```ts
// Components, types, config and browser/utility helpers — safe anywhere
import { AgilityPic, ContentZone, renderHTML } from "@agility/nextjs"

// Server-only data functions — never import into a client component
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node"
```

`@agility/nextjs/node` uses `crypto` and `process.env` and must stay on the server.

---

## Usage

### Fetching a page

```tsx
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node"

export async function generateStaticParams() {
  const paths = await getAgilityPaths({ preview: false })
  return paths.map((path) => ({ slug: path.split("/").filter(Boolean) }))
}

export default async function Page({ params }) {
  const agilityProps = await getAgilityPageProps({
    params,
    preview: false,
    locale: "en-us",
    getModule,          // (name) => your React component
    globalComponents,   // optional: components with a getCustomInitialProps
  })

  if (agilityProps.notFound) notFound()

  return <ContentZone name="MainContentZone" {...agilityProps} getModule={getModule} />
}
```

`getAgilityPageProps` returns `{ sitemapNode, page, dynamicPageItem, pageTemplateName, globalData,
languageCode, channelName, isPreview, isDevelopmentMode, notFound }`. **Always check `notFound`** —
`page` may be undefined when the path is missing from the sitemap.

### Rendering a content zone

`ContentZone` looks up each module in a zone and renders the component your `getModule` returns.

```tsx
<ContentZone name="MainContentZone" page={page} getModule={getModule} {...rest} />
```

If a module has no matching component, you get a visible placeholder in preview/development and a
thrown error in production — so a missing component fails the build rather than shipping a gap.

### Loading extra data for a module

Attach `getCustomInitialProps` to a module component. It runs during page-props resolution, on the
server, and its result arrives as `customData`.

```tsx
const PostListing: ModuleWithInit<PostListingProps, Post[]> = ({ module, customData }) => {
  return <ul>{customData.map((p) => <li key={p.contentID}>{p.fields.title}</li>)}</ul>
}

PostListing.getCustomInitialProps = async ({ agility, languageCode }) => {
  const posts = await agility.getContentList({ referenceName: "posts", languageCode })
  return posts.items
}
```

The same pattern on a component passed via `globalComponents` populates `globalData` instead —
that is how headers, footers and navigation get their data once per page.

---

## Images

Two components, and the choice matters.

### `AgilityPic` — preferred

Renders a plain `<picture>` element with your `<source>` list, each pointing at the Agility image
CDN at the size you asked for. **No client boundary**, so it works directly in a React Server
Component, and you control exactly which sizes are emitted.

```tsx
<AgilityPic
  image={fields.image}
  fallbackWidth={800}
  alt="A descriptive alternative"
  className="w-full object-cover"
  sources={[
    { media: "(min-width: 1280px)", width: 1200 },
    { media: "(min-width: 640px)",  width: 800 },
    { media: "(max-width: 639px)",  width: 400 },
  ]}
/>
```

- `fallbackWidth` sizes the `<img>` that browsers use when no `<source>` matches.
- Widths and heights are clamped to the asset's real dimensions, so the CDN is never asked to
  upscale.
- `priority` renders the `<img>` as `loading="eager"` **and** `fetchpriority="high"` — use it for
  your LCP image.
- `alt` falls back to `image.label`, then to `""`. An explicit `alt=""` is respected, so you can
  mark an image decorative.
- **SVGs pass through untouched** — no `format=auto`, no sizing, and `<source>` elements are
  skipped entirely, because rasterizing a vector is never the goal.
- A missing or empty `image` renders nothing rather than throwing.
- `className` goes on the `<img>`; `<source>` elements inherit it and do not need their own.

### `AgilityImage`

A `next/image` wrapper with a loader pointed at the Agility CDN. It carries `"use client"`, so in
the App Router it can only be used **from a client component**. Reach for it when you specifically
want `next/image`'s behaviour; otherwise prefer `AgilityPic`.

```tsx
"use client"
<AgilityImage src={fields.image.url} width={800} height={600} alt="…" />
```

SVG sources are returned untouched by the loader, including when they carry a query string
(`logo.svg?v=2`).

> **Known issue:** the `<img>` that `AgilityPic` renders does not yet carry `width`/`height`
> attributes, so it contributes layout shift (CLS) while the image loads. Reserve space with CSS
> (`aspect-ratio`) until that is addressed — see `AGILITYPIC-HANDOFF.md`.

---

## Preview mode

1. Create an API route that calls `validatePreview({ agilityPreviewKey, slug })` and, on success,
   enables Next's draft mode and redirects to the slug.
2. Call `handlePreview()` on the client. It detects the `agilitypreviewkey` query parameter Agility
   appends, strips Agility's own parameters while **preserving your own**, and redirects to your
   preview route.

```ts
import { validatePreview, generatePreviewKey } from "@agility/nextjs/node"
import { handlePreview } from "@agility/nextjs"
```

`generatePreviewKey()` derives the expected key from `AGILITY_SECURITY_KEY`; `validatePreview`
compares the incoming key against it. Both need the security key to be set.

---

## Utilities

| Export | Purpose |
|---|---|
| `renderHTML(html)` | Returns `{ __html }` for `dangerouslySetInnerHTML`, with `~/` links normalised |
| `cleanHTML(html)` | The link normalisation on its own |
| `asyncForEach(array, cb)` | Sequential async iteration |
| `expandContentItem({ agility, contentItem, languageCode, depth })` | Resolves linked content on an item |
| `expandLinkedList({ agility, contentItem, languageCode, fieldName, sortIDField })` | Resolves a linked list field, honouring the sort order |
| `expandContentList({ … })` | Bulk version. **See the caveat in [AGENTS.md §8](AGENTS.md) — it does not currently await its work.** |

Full signatures: [docs/api-reference.md](docs/api-reference.md).

---

## Caching

Page and sitemap fetches are tagged so you can revalidate precisely:

- `agility-sitemap-flat-{languageCode}`
- `agility-page-{pageID}-{languageCode}`

`AGILITY_FETCH_CACHE_DURATION` sets `revalidate`. Setting it to `0` switches every request to
`cache: "no-store"` — correct for preview, expensive for production.

---

## Documentation

| Document | For |
|---|---|
| [docs/architecture.md](docs/architecture.md) | How a request becomes a rendered page |
| [docs/api-reference.md](docs/api-reference.md) | Every export, with signatures and types |
| [docs/releasing.md](docs/releasing.md) | Build and publish runbook |
| [AGENTS.md](AGENTS.md) | Contributor and AI-agent guide, conventions, known bugs |

## Contributing

Source is in `src/` — the `.js` files at the repository root are gitignored build output. There is
no test suite; `npm run build` must be clean and changes need a manual render check. Read
[AGENTS.md](AGENTS.md) before opening a PR.

## License

[MIT](LICENSE) © Agility CMS
