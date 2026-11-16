# agility-next

Next.js support for Agility CMS.

This package makes it easy to get started with Agility CMS and Next.js.
Also includes support Nextjs Image using the AgilityImage component.

### Notes

The `agility` object that is passed around is the `api` object of the Fetch SDK.



## Images: `AgilityPic`

`AgilityPic` renders an Agility image field as a `<picture>` using the Agility image API (`?format=auto&w=…`, so browsers get AVIF or WebP). It has no client boundary, so it works in server components.

```tsx
import { AgilityPic } from "@agility/nextjs"

// A responsive image: the browser picks the file that fits the layout and the screen density.
<AgilityPic
	image={fields.image}
	sizes="(min-width: 1024px) 50vw, 100vw"
	className="h-auto w-full"
/>

// The LCP image (the hero): loaded first, with a matching preload.
<AgilityPic
	image={fields.heroImage}
	priority
	widths={[480, 768, 1080, 1440, 1920]}
	sizes="100vw"
	fallbackWidth={1080}
	className="h-auto w-full"
/>

// Art direction: a different crop or size per media query (as before 16.2).
<AgilityPic
	image={fields.image}
	fallbackWidth={800}
	sources={[
		{ media: "(min-width: 1280px)", width: 800 },
		{ media: "(min-width: 640px)", width: 640 },
		{ media: "(max-width: 639px)", width: 480 },
	]}
/>
```

| Prop | What it does |
| --- | --- |
| `image` | The image field. Only `url` is required; `width` and `height` (the original's size) cap every requested width and size the `<img>`. |
| `alt` | Alt text. Defaults to the image's label, then `""`. Pass `alt=""` for a decorative image. |
| `fallbackWidth` | The width of the `<img>`'s `src`, capped at the original's width. |
| `sizes` | How wide the image is drawn, e.g. `"(min-width: 1024px) 50vw, 100vw"`. Gives the `<img>` a width-descriptor `srcset` (default widths 320 to 2560, capped at the original's width). |
| `widths` | The widths offered in that `srcset`. With no `sizes`, `sizes` is `"100vw"`. |
| `sources` | `<source>` elements, one per media query, each sized with its `width` and/or `height`. A width-only source is capped at the original's width and gets the matching `height` attribute. |
| `priority` | For the LCP image: `loading="eager"`, `fetchpriority="high"`, and a `<link rel="preload" as="image">` when there are no `sources` (see below). Use it on one image per page. |
| `preload` | Set `false` to keep the `priority` hints without the preload. |
| `quality` | Image quality, 1 to 100, sent as `q`. Unset, the image API's default is used. |
| `intrinsicSize` | Default `true`: the `<img>` gets `width` and `height` (the `src`'s width at the original's aspect ratio), so the browser reserves its space and the page doesn't shift. Set `false` to leave them off. |
| `className` | The `<img>`'s class. |
| any `<img>` attribute | `decoding`, `fetchPriority`, `loading`, `width`, `height`, `style`, `id`, `data-*` and the rest pass through to the `<img>` and win over the defaults above. |

- **Preloading with `sources`.** A preload can't say "only if no earlier `<source>` matched", so a `priority` image with `sources` gets `fetchpriority="high"` and `loading="eager"` but no preload, which avoids fetching a file the browser then doesn't use. For an LCP image, use `sizes` (and `widths`) instead of `sources` unless you need a different crop per breakpoint. The preload uses React 19's `preload()` from `react-dom`, and the `<link>` lands in the document's `<head>`.
- **`width` and `height` (since 16.2).** They match the size the image already rendered at when nothing else sized it, so an unstyled image looks the same. If your CSS sets an image's `width` but not its `height`, add `height: auto` (Tailwind's preflight already does), or the image is stretched to the `height` attribute; or pass `intrinsicSize={false}`.
- SVGs, and `.jfif` / `.jpe` files (the image API returns a 404 for them with any query), are rendered as-is: no image API query, no `sources`, no `srcset`.

## Structured data and AI search (GEO / AEO)

`@agility/nextjs/geo` turns a page's `seo` and `geo` properties from the Fetch API into Next.js metadata and one schema.org JSON-LD `<script>`. It needs [`@agility/geo`](https://github.com/agility/agility-geo) installed alongside this package:

```bash
npm install @agility/geo
```

```tsx
// app/[...slug]/page.tsx
import { AgilityJsonLd, generateAgilityMetadata, resolveAgilityAlternates } from "@agility/nextjs/geo"

const SITE = "https://www.example.com"
const LOCALES = ["en-us", "fr-ca"]
const DEFAULT_LOCALE = "en-us"

export async function generateMetadata({ params }) {
	const { page, sitemapNode, dynamicPageItem, languageCode } = await getAgilityPage({ params })
	// Each locale's flat sitemap, keyed by locale code (`agility` is the Fetch SDK's api object).
	const sitemaps = Object.fromEntries(
		await Promise.all(LOCALES.map(async (languageCode) => [languageCode, await agility.getSitemapFlat({ channelName: "website", languageCode })])),
	)
	return generateAgilityMetadata({
		page,
		item: dynamicPageItem,           // on a dynamic page
		url: `${SITE}${sitemapNode.path}`,
		title: sitemapNode.title,        // used when the page (or item) has no SEO title
		titleTemplate: "%s | Example",   // applied to that fallback only
		alternates: resolveAgilityAlternates({
			sitemaps,
			pageID: sitemapNode.pageID,
			contentID: sitemapNode.contentID,
			toUrl: (locale, path) => (locale === DEFAULT_LOCALE ? `${SITE}${path}` : `${SITE}/${locale}${path}`),
		}),
		defaultLocale: DEFAULT_LOCALE,   // also emitted as x-default
	})
}

export default async function Page({ params }) {
	const { page, sitemapNode, dynamicPageItem, languageCode } = await getAgilityPage({ params })
	const sitemap = await agility.getSitemapFlat({ channelName: "website", languageCode })
	return (
		<>
			<AgilityJsonLd
				page={page}
				item={dynamicPageItem}
				url={`${SITE}${sitemapNode.path}`}
				locale={languageCode}
				sitemap={sitemap}             // breadcrumb, and a dynamic item's name
			/>
			{/* … */}
		</>
	)
}
```

- `generateAgilityMetadata()` returns only what the page sets: `title` (an editor's SEO title is used as-is, without the template), `description` (falls back to `geo.summary`), `keywords`, the canonical URL (`seo.canonicalUrl`, otherwise `url` without its query string and fragment), `robots`, the share image (`seo.ogImage`) and `hreflang` alternates (from `alternates`, with `x-default` for `defaultLocale`). A site-relative canonical or share image (`/blog`, `/og.png`) is resolved against `url`. Merge it over your own defaults.
- `<AgilityJsonLd />` renders a WebPage typed by `geo.schemaType`, a BreadcrumbList when you pass a flat `sitemap` (on a dynamic page the sitemap also names the item's WebPage), and the editor's `geo.structuredData` merged in by `@id`, as one escaped `@graph`. It's rendered on the server, so crawlers that don't run JavaScript see it.
- `resolveAgilityAlternates()` finds each locale's URL for a page from each locale's flat sitemap, for the `alternates` option.
- **Dynamic pages:** pass the item (`dynamicPageItem`, with its own `seo` and `geo`). Its `geo.schemaType`, `seo.robots` and each `geo.ai` property are its own, else the dynamic page's (the dynamic page's values are the defaults for all its items). Its title (pass `title` and `sitemap`; the dynamic page's title is never used), canonical URL, share image, description, `geo.summary` and `geo.structuredData` are its own only: the dynamic page's describe the listing page, so they aren't applied to its items. An item with no summary is described by its `seo.metaDescription`. The rule is implemented once, in `@agility/geo`.

## Releasing

Publishing runs in GitHub Actions (`.github/workflows/npm-publish.yml`) with npm Trusted Publishing, so no npm token is stored anywhere:

1. In a PR, bump `version` in `package.json` and move the `## [Unreleased]` notes in `CHANGELOG.md` under a new `## [<version>] - <date>` heading. Merge it.
2. Push a matching tag: `git tag v<version> && git push origin v<version>`.
3. The workflow checks the tag matches `package.json` and that `CHANGELOG.md` has a section for it, then builds, typechecks, tests, publishes to the `beta` dist-tag with provenance, and creates a GitHub pre-release with that section as its notes.
4. Once verified, promote it: `npm dist-tag add @agility/nextjs@<version> latest`.
