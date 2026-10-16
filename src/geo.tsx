/**
 * GEO / AEO adapters for Next.js: turn a page's `seo` and `geo` properties from the Agility Fetch API
 * into Next.js metadata and a schema.org JSON-LD `<script>`.
 *
 * Import from `@agility/nextjs/geo`. This entry point needs `@agility/geo` installed alongside
 * `@agility/nextjs`; the rest of `@agility/nextjs` doesn't.
 *
 * Dynamic pages: when an item is rendered on a dynamic page, the item's own `seo` and `geo` are
 * combined with the dynamic page's by `@agility/geo` (`resolvePageGeo`), so the rule lives in one
 * place: `geo.schemaType`, `seo.robots` and each `geo.ai` property are the item's own, else the
 * dynamic page's; `geo.summary` and `geo.structuredData` are the item's own only. The dynamic page's
 * title, canonical URL, share image, description, summary and JSON-LD describe the dynamic page
 * itself, so they are never applied to its items (the item's own values are used instead).
 */
import React from "react"
import type { Metadata } from "next"
import {
	buildJsonLd,
	resolvePageGeo,
	serializeJsonLd,
	toLanguageTag,
	type BuildJsonLdOptions,
	type GeoContentItem,
	type GeoPage,
	type GeoSitemapFlat,
} from "@agility/geo"

const nonEmpty = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() !== "" ? value.trim() : undefined

const isObject = (value: unknown): value is { [key: string]: unknown } =>
	typeof value === "object" && value !== null && !Array.isArray(value)

/** The page being rendered, and the item when it's a dynamic page. */
export interface AgilityGeoInput {
	/** The page from the Fetch API (`getPage`, or `page` from `getAgilityPageProps`). */
	page: GeoPage | null | undefined
	/**
	 * The content item, when rendering an item on a dynamic page (`dynamicPageItem`), with its own
	 * `seo` and `geo` as the Fetch API returns them.
	 */
	item?: GeoContentItem | null
	/** The absolute public URL of the page (or item) being rendered, without a query string. */
	url: string
	/** The page's locale, e.g. `en-us`. */
	locale?: string | null
}

export interface GenerateAgilityMetadataOptions extends AgilityGeoInput {
	/**
	 * The title to use when the page has no `seo.title`, for example the sitemap node's title.
	 * Defaults to `page.title`. On a dynamic page, pass the item's title (the sitemap node's `title`).
	 */
	title?: string | null
	/**
	 * A template for the fallback title, with `%s` where the title goes, e.g. `"%s | My Site"`.
	 * It isn't applied to `seo.title`: an editor who sets a title has written the whole `<title>`.
	 */
	titleTemplate?: string
	/**
	 * The URL of each locale version of this page, keyed by locale code (`en-us`, `fr-ca`), for
	 * `hreflang` alternates. Build it with `resolveAgilityAlternates`. Emitted only when the page
	 * exists in at least two locales.
	 */
	alternates?: { [locale: string]: string } | null
	/** The site's default locale. Its URL is also emitted as the `x-default` alternate. */
	defaultLocale?: string | null
}

/**
 * Build the Next.js metadata for an Agility page from its `seo` and `geo` properties.
 *
 * Returns only what the page sets, so merge it over your own defaults:
 * - `title`: `seo.title` as an absolute title; otherwise the fallback title (through `titleTemplate`).
 * - `description`: `seo.metaDescription`, falling back to `geo.summary`.
 * - `keywords`: `seo.metaKeywords`.
 * - `alternates.canonical`: `seo.canonicalUrl`, otherwise `url`.
 * - `alternates.languages`: `hreflang` alternates, with `x-default`.
 * - `robots`: from `seo.robots`, when set.
 * - `openGraph.images`: `seo.ogImage`, when set.
 *
 * For an item on a dynamic page, every value above is the **item's own** `seo` / `geo` (its
 * `geo.summary`, never the dynamic page's), except `robots`, which falls back to the dynamic page's
 * when the item sets none. The combination is `resolvePageGeo` from `@agility/geo`.
 *
 * `<script>` tags (JSON-LD) can't be output through metadata; render `<AgilityJsonLd />` in the page.
 */
export function generateAgilityMetadata(options: GenerateAgilityMetadataOptions): Metadata {
	const { page, url, titleTemplate } = options
	if (!page) return {}

	const item = options.item || undefined
	// The item's own `seo` when rendering a dynamic page's item; the dynamic page's never applies.
	const seo = (item ? item.seo : page.seo) || undefined
	// The page/item combination rule lives in @agility/geo.
	const resolved = resolvePageGeo({ page, item })
	const metadata: Metadata = {}

	// title
	const seoTitle = nonEmpty(seo?.title)
	if (seoTitle) {
		metadata.title = { absolute: seoTitle }
	} else {
		const fallback = nonEmpty(options.title) ?? nonEmpty(page.title)
		if (fallback) metadata.title = titleTemplate ? titleTemplate.split("%s").join(fallback) : fallback
	}

	// description and keywords (resolved.summary is already the item's own on a dynamic page)
	const description = nonEmpty(seo?.metaDescription) ?? resolved.summary
	if (description) metadata.description = description

	const keywords = nonEmpty(seo?.metaKeywords)
	if (keywords) metadata.keywords = keywords

	// canonical and hreflang alternates
	const canonical = nonEmpty(seo?.canonicalUrl) ?? nonEmpty(url)
	const alternates: NonNullable<Metadata["alternates"]> = {}
	if (canonical) alternates.canonical = canonical

	const languages = toHrefLangs(options.alternates, options.defaultLocale)
	if (languages) alternates.languages = languages as NonNullable<Metadata["alternates"]>["languages"]
	if (alternates.canonical || alternates.languages) metadata.alternates = alternates

	// robots (the item's own, else the dynamic page's)
	const robots = resolved.robots
	if (isObject(robots) && (typeof robots.index === "boolean" || typeof robots.follow === "boolean")) {
		metadata.robots = { index: robots.index !== false, follow: robots.follow !== false }
	}

	// share image
	const ogImage = nonEmpty(seo?.ogImage)
	if (ogImage) metadata.openGraph = { images: [{ url: ogImage }] }

	return metadata
}

const toHrefLangs = (
	alternates: { [locale: string]: string } | null | undefined,
	defaultLocale: string | null | undefined,
): { [hreflang: string]: string } | undefined => {
	if (!alternates) return undefined
	const entries = Object.keys(alternates)
		.map((locale) => ({ locale, href: nonEmpty(alternates[locale]) }))
		.filter((entry): entry is { locale: string; href: string } => !!entry.href && !!nonEmpty(entry.locale))
	if (entries.length < 2) return undefined

	const languages: { [hreflang: string]: string } = {}
	for (const { locale, href } of entries) languages[toLanguageTag(locale)] = href

	const defaultEntry = defaultLocale
		? entries.find((entry) => entry.locale.toLowerCase() === defaultLocale.toLowerCase())
		: undefined
	if (defaultEntry) languages["x-default"] = defaultEntry.href
	return languages
}

/** One entry of a flat sitemap, as `getSitemapFlat` returns it. */
export interface AgilityAlternateSitemapNode {
	pageID?: number
	contentID?: number
	path: string
	redirect?: unknown
	isFolder?: boolean
}

export interface ResolveAgilityAlternatesOptions {
	/** Each locale's flat sitemap (`getSitemapFlat`), keyed by locale code. */
	sitemaps: { [locale: string]: { [path: string]: AgilityAlternateSitemapNode } | null | undefined }
	/** The page being rendered. */
	pageID: number
	/** On a dynamic page, the item being rendered. */
	contentID?: number | null
	/**
	 * Turns a locale and a sitemap path into the public URL, e.g.
	 * `(locale, path) => \`https://example.com/${locale}${path}\``.
	 */
	toUrl: (locale: string, path: string) => string
}

/**
 * Find the URL of every locale version of a page (or of a dynamic page's item), for
 * `generateAgilityMetadata({ alternates })`. A page has the same `pageID` in every locale, and an
 * item the same `contentID`; locales where the page isn't in the sitemap are left out.
 */
export function resolveAgilityAlternates(options: ResolveAgilityAlternatesOptions): { [locale: string]: string } {
	const { sitemaps, pageID, toUrl } = options
	const contentID = options.contentID && options.contentID > 0 ? options.contentID : undefined
	const result: { [locale: string]: string } = {}

	for (const locale of Object.keys(sitemaps)) {
		const sitemap = sitemaps[locale]
		if (!sitemap) continue
		for (const key of Object.keys(sitemap)) {
			const node = sitemap[key]
			if (!node || node.pageID !== pageID || node.isFolder || node.redirect) continue
			if (contentID ? node.contentID !== contentID : node.contentID && node.contentID > 0) continue
			result[locale] = toUrl(locale, node.path || key)
			break
		}
	}
	return result
}

export interface AgilityJsonLdProps extends AgilityGeoInput {
	/** A flat sitemap (`getSitemapFlat`). When given, a BreadcrumbList is built from the page's path. */
	sitemap?: GeoSitemapFlat | null
	/**
	 * The page's path in the sitemap, for the breadcrumb. Defaults to the URL's path. Pass it when the
	 * public URL adds a prefix (a locale segment, a base path) the sitemap doesn't have.
	 */
	path?: string
	/** The origin breadcrumb links are built on. Defaults to the URL's origin. */
	baseUrl?: string
	/** Site settings, passed through to `buildJsonLd`. */
	siteSettings?: BuildJsonLdOptions["siteSettings"]
	/** Passed through to `buildJsonLd`. */
	organization?: BuildJsonLdOptions["organization"]
	/** A hook that runs last and may add, change or remove nodes (see `@agility/geo`). */
	transform?: BuildJsonLdOptions["transform"]
	/** A CSP nonce for the `<script>` tag. */
	nonce?: string
}

/**
 * Render the page's schema.org JSON-LD as one `<script type="application/ld+json">`, built by
 * `buildJsonLd` from `@agility/geo`: the WebPage (typed by `geo.schemaType`), a BreadcrumbList when a
 * sitemap is passed, and the editor's `geo.structuredData` merged in by `@id`. On a dynamic page,
 * pass the item (with its `geo`): `@agility/geo` combines it with the dynamic page's.
 *
 * Server-rendered, so AI crawlers (which don't run JavaScript) see it. The output is escaped, so
 * editor-supplied text such as `</script>` can't close the tag. Renders nothing if the page is
 * missing or the graph can't be built.
 */
export function AgilityJsonLd(props: AgilityJsonLdProps) {
	const json = buildAgilityJsonLdString(props)
	if (!json) return null
	return <script type="application/ld+json" nonce={props.nonce} dangerouslySetInnerHTML={{ __html: json }} />
}

/** The escaped JSON-LD `AgilityJsonLd` renders, or `null` when there's nothing to render. */
export function buildAgilityJsonLdString(props: AgilityJsonLdProps): string | null {
	const { page, item, url, locale, sitemap, path, baseUrl, siteSettings, organization, transform } = props
	if (!page || !nonEmpty(url)) return null
	try {
		const doc = buildJsonLd({
			page,
			item: item || undefined,
			url,
			locale: locale || undefined,
			sitemap: sitemap || undefined,
			path,
			baseUrl,
			siteSettings,
			organization,
			transform,
		})
		if (!doc || !Array.isArray(doc["@graph"]) || doc["@graph"].length === 0) return null
		return serializeJsonLd(doc)
	} catch (error) {
		console.warn("AgilityCMS => Could not build the page's JSON-LD.", error)
		return null
	}
}
