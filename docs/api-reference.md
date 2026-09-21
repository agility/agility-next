# API Reference

Every public export of `@agility/nextjs`, by entry point.

- [`@agility/nextjs/node`](#agilitynextjsnode) — server-only data functions
- [`@agility/nextjs`](#agilitynextjs) — components, helpers, config
- [Types](#types)

---

## `@agility/nextjs/node`

Server only. Uses `crypto` and `process.env`; never import from a client component.

### `getAgilityPageProps(context)`

Resolves everything needed to render one Agility page.

```ts
function getAgilityPageProps(
  context: AgilityGetStaticPropsContext
): Promise<AgilityPageProps>
```

**Context**

| Field | Type | Notes |
|---|---|---|
| `params` | `{ slug?: string \| string[] }` | Slug segments. Absent or empty → the home page. |
| `preview` | `boolean` | Forced `true` when `NODE_ENV === "development"`. |
| `locale` | `string` | Falls back to `defaultLocale`, then `AGILITY_LOCALES[0]`. |
| `defaultLocale` | `string` | |
| `getModule` | `(name: string) => ModuleWithInit \| null` | Optional. Needed only to run modules' `getCustomInitialProps`. |
| `globalComponents` | `{ [name]: ComponentWithInit }` | Each entry's `getCustomInitialProps` result lands in `globalData[name]`. |
| `apiOptions` | `ApiOptions` | Merged over the defaults below. |

**`apiOptions` defaults**

```ts
{ onSitemapRetrieved: null, expandAllContentLinks: true, contentLinkDepth: 3 }
```

`onSitemapRetrieved` is called as `({ sitemap, isPreview, isDevelopmentMode })` right after the
sitemap loads — a hook for caching or inspecting the sitemap yourself.

**Returns** `AgilityPageProps`:

| Field | Type | Notes |
|---|---|---|
| `sitemapNode` | `AgilitySitemapNode \| null` | |
| `page` | `Page \| undefined` | **Undefined when not found.** Check `notFound` first. |
| `dynamicPageItem` | `any` | Present when the sitemap node has a `contentID`. |
| `pageTemplateName` | `string \| null` | `page.templateName` with non-alphanumerics stripped. |
| `globalData` | `{ [name]: any }` | |
| `languageCode`, `channelName` | `string` | |
| `isPreview`, `isDevelopmentMode`, `notFound` | `boolean` | |

**Throws** if a module's or global component's `getCustomInitialProps` throws — wrapped with the
component name. Missing pages are *not* thrown; they come back as `notFound: true`.

```ts
const props = await getAgilityPageProps({ params, preview: false, locale, getModule })
if (props.notFound) notFound()
```

---

### `getAgilityPaths(options)`

Every renderable path, for static generation.

```ts
function getAgilityPaths(options: {
  preview: boolean
  locales?: string[]        // defaults to AGILITY_LOCALES
  defaultLocale?: string    // defaults to AGILITY_LOCALES[0]
}): Promise<string[]>
```

Excludes sitemap nodes that are redirects or folders. Non-default locales are prefixed with
`/{languageCode}`, so a two-locale site returns `["/", "/about", "/fr-ca/", "/fr-ca/about"]`.

Logs `AgilityCMS => 'getAgilityPaths' *** USING REST API ***` on every call regardless of the debug
setting. A locale with no sitemap is warned about and skipped rather than failing the build.

---

### `getDynamicPageURL(options)`

Maps a content item to the URL of the dynamic page that renders it.

```ts
function getDynamicPageURL(options: {
  contentID: number
  preview: boolean
  slug?: string | null
  locale?: string | null
}): Promise<string | null>
```

Returns the **first** matching path, or `null`. An unrecognised `locale` warns and falls back to the
default. `slug` is accepted but currently unused — the sitemap is not yet inspected for a leading
language code (there is a `TODO` in the source to that effect).

---

### `validatePreview(options)`

```ts
function validatePreview(options: {
  agilityPreviewKey: string
  slug: string
}): Promise<{ error: boolean; message: string | null }>
```

Compares the incoming key against `generatePreviewKey()`. Spaces are converted back to `+` first,
since URL decoding turns `+` into a space. Returns `{ error: true, message }` rather than throwing,
so an API route can respond with a clean status.

Requires `AGILITY_SECURITY_KEY`.

---

### `generatePreviewKey()`

```ts
function generatePreviewKey(): Promise<string>
```

The expected preview key for this instance: SHA-512 of `-1_{securityKey}_Preview` with each
character expanded to a byte pair (character code, then `0`), base64-encoded. Requires
`AGILITY_SECURITY_KEY`.

---

## `@agility/nextjs`

### `<ContentZone />`

Renders every module in a named page zone.

```ts
interface ContentZoneProps {
  name: string
  page: Page
  sitemapNode: AgilitySitemapNode
  dynamicPageItem?: any
  languageCode: string
  channelName: string
  getModule(moduleName: string): any
  isDevelopmentMode: boolean
  isPreview: boolean
  globalData?: { [name: string]: any }
}
```

Returns `null` (with a console warning) when the zone does not exist. For each module it resolves
the name from `m.module` or `item.properties.definitionName`, asks `getModule` for the component,
and renders it with `{ page, sitemapNode, dynamicPageItem, module, languageCode, channelName,
customData, isDevelopmentMode, isPreview, globalData }`.

Unresolved module in preview/development → a visible placeholder. In production → a thrown error.

---

### `<AgilityPic />`

A `<picture>` element with per-breakpoint sources against the Agility image CDN. **No client
boundary** — usable directly in a Server Component. Prefer this over `AgilityImage`.

```ts
interface AgilityPicProps {
  image: ImageField
  fallbackWidth?: number
  alt?: string
  sources?: AgilityImageSourceProps[]   // <source> attributes minus srcSet
  priority?: boolean
  className?: string
}
```

| Prop | Behaviour |
|---|---|
| `image` | Agility image field. `url`, `width`, `height` and `label` are all used. |
| `fallbackWidth` | Sizes the `<img>` used when no `<source>` matches: `?format=auto&w={fallbackWidth}`. |
| `sources` | Each becomes a `<source>`; `width`/`height` become `w`/`h` CDN parameters. |
| `alt` | `alt ?? image.label ?? ""`. An explicit `alt=""` is respected (decorative image). |
| `priority` | `loading="eager"` **and** `fetchpriority="high"`. |
| `className` | Applied to the `<img>`; `<source>` elements inherit it. |

Width-only sources are clamped to `image.width`, height-only to `image.height`, so the CDN is never
asked to upscale.

**SVGs bypass the image API entirely** — no `format=auto`, no `w`/`h`, and the `<source>` list is
skipped, so the vector is served as-is. The check parses the URL, so `logo.svg?v=2` is caught.

A missing or empty `image` returns `null` instead of throwing.

```tsx
<AgilityPic
  image={fields.image}
  fallbackWidth={800}
  alt="Product photograph"
  sources={[
    { media: "(min-width: 1280px)", width: 1200 },
    { media: "(max-width: 639px)",  width: 400 },
  ]}
/>
```

> **Known gap** — the `<img>` still carries no `width`/`height`, so it contributes layout shift
> while loading. Reserve space with CSS until that lands. See `AGILITYPIC-HANDOFF.md` (fixes 1
> and 4 remain outstanding).

---

### `<AgilityImage />`

`next/image` with an Agility CDN loader. Accepts all `next/image` props.

**Marked `"use client"`** — in the App Router this component can only be used from a client
component. Use `AgilityPic` unless you specifically need `next/image`.

The default loader:
- clamps the requested width to the `width` prop, so the CDN is not asked to upscale
- defaults quality to `60`
- returns SVG URLs untouched, including when they carry a query string (`logo.svg?v=2`) — it
  shares the same `isSvgUrl` helper as `AgilityPic`

Supplying your own `loader` bypasses all of it.

---

### `handlePreview(props?)`

```ts
function handlePreview(props?: { previewHandlerUrl?: string }): boolean
```

Client-side. Returns `false` immediately if not in a browser or if no `agilitypreviewkey` query
parameter is present. Otherwise it strips `agilitypreviewkey`, `agilityts` and `AgilityChannelID`,
**preserves your remaining query string**, appends `ContentID` when present, logs, and redirects to
the preview route (default `/api/preview`) after 2.5 seconds — returning `true`.

> Guards on `process.browser`, a legacy Next 9 / webpack global. See AGENTS.md §8.

---

### Utilities

```ts
function renderHTML(html: string): { __html: string }
function cleanHTML(html: string): string
```

`cleanHTML` rewrites `href="~/..."` to `href="/..."` — Agility stores root-relative links with a
tilde. `renderHTML` wraps the result for `dangerouslySetInnerHTML`. Both return safely on empty
input.

```tsx
<div dangerouslySetInnerHTML={renderHTML(fields.textblob)} />
```

Note neither sanitizes; they only fix link syntax. Trust your CMS content accordingly.

```ts
function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void>
```

Sequential async iteration — each callback awaited before the next. Use it when order matters or
when you need to avoid hammering the API in parallel.

```ts
function expandContentItem({ agility, contentItem, languageCode, depth = 1 }): Promise<ContentItem | null>
```

Resolves linked content one level at a time. Reads `.fields` or `.customFields`, and for each value
expands either a single link (`contentid > 0`) or a multi-link (`sortids`), recursing with
`depth - 1`. Mutates the item in place and returns it.

```ts
function expandLinkedList({ agility, contentItem, languageCode, fieldName, sortIDField }): Promise<ContentItem | null>
```

Fetches the full content list behind a linked-list field and orders it by the IDs in `sortIDField`,
appending anything not named in the sort order. **Throws** if the field is missing or has no
`referencename`.

```ts
function expandContentList({ agility, contentItems, languageCode, depth }): Promise<void>
```

> **Broken:** it calls `asyncForEach` without awaiting, so it resolves before the expansion
> finishes. Loop over `expandContentItem` yourself until this is fixed.

---

## Types

From [`src/types.ts`](../src/types.ts).

### Page data

```ts
interface AgilityPageProps {
  sitemapNode: AgilitySitemapNode
  page?: Page
  dynamicPageItem?: any
  pageTemplateName?: string | null
  languageCode?: string | null
  channelName?: string | null
  isPreview?: boolean
  isDevelopmentMode?: boolean
  notFound?: boolean
  getModule?(moduleName: string): ModuleWithInit | null
  globalData?: { [name: string]: any }
}

interface AgilitySitemapNode {
  title: string
  name: string
  pageID: number
  menuText: number
  visible: { menu?: boolean; sitemap?: boolean }
  path: string
  redirect: string | null
  isFolder: false
  contentID?: number
}
```

### Module components

```ts
interface Module<TContent> extends FC<ModuleProps<TContent>> {}
interface ModuleWithDynamic<TContent, TDynamicPageItem> extends FC<DynamicModuleProps<…>> {}
interface UnloadedModule extends FC<UnloadedModuleProps> {}

interface ModuleWithInit<TProps = {}, TInit = {}> extends FC<CustomInitProps<TProps, TInit>> {
  getCustomInitialProps?(props: CustomInitPropsArg): Promise<TInit>
}

interface ComponentWithInit<TInit = {}> extends FC<AgilityPageProps> {
  getCustomInitialProps?(props: GlobalCustomInitPropsArg): Promise<TInit>
}
```

`ModuleProps<T>` carries `page`, `module: ContentItem<T>`, `languageCode`, `channelName`,
`sitemapNode`, `dynamicPageItem`, `isDevelopmentMode`, `isPreview`, `globalData`.
`CustomInitProps<T, C>` extends it with `customData: C`.

`UnloadedModuleProps` is the same shape but with `module: { contentid: number }` — an unexpanded
reference, for lazy-loading a module's content yourself.

### Callback arguments

```ts
interface CustomInitPropsArg {
  item: any            // the module's content item
  page: Page
  agility: ApiClientInstance
  languageCode: string
  channelName: string
  sitemapNode: AgilitySitemapNode
  dynamicPageItem?: any
}
```

`GlobalCustomInitPropsArg` is identical without `item` — global components are not tied to one
module.

`agility` is the live `@agility/content-fetch` client, already authenticated for the right
(preview or live) key.

### Fields

```ts
interface ImageField {
  label: string
  url: string
  target: string
  filesize: number
  height: number
  width: number
}

interface URLField { href: string; target: string; text: string }

interface Properties {
  state: number
  modified: string
  versionID: number
  referenceName: string
  definitionName: string
  itemOrder: number
}
```

> **`ImageField` is stricter than reality.** The API returns `label: null` and `target: null`, and
> also sends `pixelHeight` / `pixelWidth` as strings, which the interface omits. See issue #31.
> Gallery images are a different shape again — issue #32.

### Options

```ts
interface ApiOptions {
  onSitemapRetrieved?: Function
  expandAllContentLinks?: boolean
  contentLinkDepth?: number
}

interface IGetDynamicPageURLProps {
  contentID: number
  preview: boolean
  slug?: string | null
  locale?: string | null
}
```

### Re-exports

`ContentItem` and `ApiClientInstance` are re-exported from `@agility/content-fetch`.

### Config

```ts
export let agilityConfig: {
  guid, fetchAPIKey, previewAPIKey, securityKey: string | undefined
  locales: string[]
  channelName: string
  debug: boolean
  defaultCacheDuration: number
}
```

Populated from the environment **at module load**. Exported as `let`, so it is technically
writable — but `node.ts` copies `securityKey`, `channelName` and `defaultCacheDuration` into its own
constants when *it* loads, so late mutation is unreliable. Treat it as read-only.
