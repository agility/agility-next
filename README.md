# agility-next

Next.js support for Agility CMS.

This package makes it easy to get started with Agility CMS and Next.js.
Also includes support Nextjs Image using the AgilityImage component.

### Notes

The `agility` object that is passed around is the `api` object of the Fetch SDK.



## Structured data and AI search (GEO / AEO)

`@agility/nextjs/geo` turns a page's `seo` and `geo` properties from the Fetch API into Next.js metadata and one schema.org JSON-LD `<script>`. It needs [`@agility/geo`](https://github.com/agility/agility-geo) installed alongside this package:

```bash
npm install @agility/geo
```

```tsx
// app/[...slug]/page.tsx
import { AgilityJsonLd, generateAgilityMetadata } from "@agility/nextjs/geo"

export async function generateMetadata({ params }) {
	const { page, sitemapNode, dynamicPageItem } = await getAgilityPage({ params })
	return generateAgilityMetadata({
		page,
		item: dynamicPageItem,           // on a dynamic page
		url: `https://www.example.com${sitemapNode.path}`,
		title: sitemapNode.title,        // used when the page has no SEO title
		titleTemplate: "%s | Example",   // applied to that fallback only
	})
}

export default async function Page({ params }) {
	const { page, sitemapNode, dynamicPageItem, languageCode } = await getAgilityPage({ params })
	return (
		<>
			<AgilityJsonLd page={page} item={dynamicPageItem} url={`https://www.example.com${sitemapNode.path}`} locale={languageCode} />
			{/* … */}
		</>
	)
}
```

- `generateAgilityMetadata()` returns only what the page sets: `title` (an editor's SEO title is used as-is, without the template), `description` (falls back to `geo.summary`), `keywords`, the canonical URL (`seo.canonicalUrl`, otherwise `url`), `robots`, the share image (`seo.ogImage`) and `hreflang` alternates. Merge it over your own defaults.
- `<AgilityJsonLd />` renders a WebPage typed by `geo.schemaType`, a BreadcrumbList when you pass a flat `sitemap`, and the editor's `geo.structuredData` merged in by `@id`, as one escaped `@graph`. It's rendered on the server, so crawlers that don't run JavaScript see it.
- `resolveAgilityAlternates()` finds each locale's URL for a page from each locale's flat sitemap, for the `alternates` option.
- **Dynamic pages:** pass the item (`dynamicPageItem`, with its own `seo` and `geo`). Its `geo.schemaType`, `seo.robots` and each `geo.ai` property are its own, else the dynamic page's (the dynamic page's values are the defaults for all its items). Its title, canonical URL, share image, description, `geo.summary` and `geo.structuredData` are its own only: the dynamic page's describe the listing page, so they aren't applied to its items. An item with no summary is described by its `seo.metaDescription`. The rule is implemented once, in `@agility/geo`.

## Releasing

Publishing runs in GitHub Actions (`.github/workflows/npm-publish.yml`) with npm Trusted Publishing, so no npm token is stored anywhere:

1. In a PR, bump `version` in `package.json` and move the `## [Unreleased]` notes in `CHANGELOG.md` under a new `## [<version>] - <date>` heading. Merge it.
2. Push a matching tag: `git tag v<version> && git push origin v<version>`.
3. The workflow checks the tag matches `package.json` and that `CHANGELOG.md` has a section for it, then builds, typechecks, tests, publishes to the `beta` dist-tag with provenance, and creates a GitHub pre-release with that section as its notes.
4. Once verified, promote it: `npm dist-tag add @agility/nextjs@<version> latest`.
