// Tests for the GEO / AEO adapters (src/geo.tsx). Run with `npm test`, which compiles src/ to
// .test-build/ first.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const {
	generateAgilityMetadata,
	resolveAgilityAlternates,
	AgilityJsonLd,
	buildAgilityJsonLdString,
} = require("../.test-build/geo.js")

const page = {
	pageID: 12,
	title: "Products",
	seo: {
		metaDescription: "All our products",
		metaKeywords: "cms, headless",
		metaHTML: "",
		title: "Products | Example",
		canonicalUrl: "https://www.example.com/products",
		robots: { index: false, follow: true },
		ogImage: "https://cdn.example.com/share.png",
	},
	geo: {
		schemaType: "CollectionPage",
		summary: "The product list.",
		structuredData: { "@type": "Thing", "@id": "https://www.example.com/#thing", name: "</script><b>x</b>" },
		ai: { llmsInclude: "include", crawl: "block" },
	},
}

const plainPage = { pageID: 3, title: "About", seo: { metaDescription: "", metaKeywords: "", metaHTML: "" } }

const item = { contentID: 99, seo: { metaDescription: "One product", metaKeywords: "", metaHTML: "" }, fields: {} }

test("page: seo.title is absolute; canonical, robots and share image come from seo", () => {
	const m = generateAgilityMetadata({ page, url: "https://www.example.com/products?x=1", titleTemplate: "%s | Site" })
	assert.deepEqual(m.title, { absolute: "Products | Example" })
	assert.equal(m.description, "All our products")
	assert.equal(m.keywords, "cms, headless")
	assert.equal(m.alternates.canonical, "https://www.example.com/products")
	assert.deepEqual(m.robots, { index: false, follow: true })
	assert.deepEqual(m.openGraph, { images: [{ url: "https://cdn.example.com/share.png" }] })
})

test("page without GEO data: fallback title through the template, canonical is the URL, nothing else", () => {
	const m = generateAgilityMetadata({ page: plainPage, url: "https://www.example.com/about", title: "About us", titleTemplate: "%s | Site" })
	assert.equal(m.title, "About us | Site")
	assert.equal(m.description, undefined)
	assert.equal(m.keywords, undefined)
	assert.deepEqual(m.alternates, { canonical: "https://www.example.com/about" })
	assert.equal(m.robots, undefined)
	assert.equal(m.openGraph, undefined)
})

test("page: description falls back to geo.summary", () => {
	const m = generateAgilityMetadata({ page: { ...page, seo: { ...page.seo, metaDescription: "" } }, url: "https://www.example.com/products" })
	assert.equal(m.description, "The product list.")
})

test("geo delivered as a JSON string, or invalid, never throws", () => {
	const asString = generateAgilityMetadata({ page: { ...plainPage, geo: JSON.stringify({ summary: "From a string" }) }, url: "https://e.com/a" })
	assert.equal(asString.description, "From a string")
	const invalid = generateAgilityMetadata({ page: { ...plainPage, geo: "{not json" }, url: "https://e.com/a" })
	assert.equal(invalid.description, undefined)
	assert.deepEqual(generateAgilityMetadata({ page: null, url: "https://e.com/a" }), {})
})

test("dynamic page item with no seo/geo of its own: only robots carry over; title, canonical, image and description don't", () => {
	const m = generateAgilityMetadata({ page, item, url: "https://www.example.com/products/widget", title: "Widget", titleTemplate: "%s | Site" })
	assert.equal(m.title, "Widget | Site")
	assert.equal(m.description, "One product")
	assert.equal(m.keywords, undefined)
	assert.equal(m.alternates.canonical, "https://www.example.com/products/widget")
	assert.deepEqual(m.robots, { index: false, follow: true })
	assert.equal(m.openGraph, undefined)
})

test("dynamic page item with no description of its own gets none (not the page's or its summary)", () => {
	const m = generateAgilityMetadata({ page, item: { contentID: 5 }, url: "https://www.example.com/products/x" })
	assert.equal(m.description, undefined)
})

const itemWithGeo = {
	contentID: 100,
	seo: { metaDescription: "", metaKeywords: "", metaHTML: "" },
	geo: {
		schemaType: "Product",
		summary: "The widget's own summary.",
		structuredData: { "@type": "Product", "@id": "https://www.example.com/products/widget#product", name: "Widget" },
		ai: { crawl: "inherit", llmsInclude: "exclude" },
	},
	fields: {},
}

test("dynamic page item with its own geo: its summary is the description, never the page's", () => {
	const m = generateAgilityMetadata({ page, item: itemWithGeo, url: "https://www.example.com/products/widget", title: "Widget" })
	assert.equal(m.title, "Widget")
	assert.equal(m.description, "The widget's own summary.")
	assert.deepEqual(m.robots, { index: false, follow: true })
	assert.equal(m.openGraph, undefined)
	// The item's meta description wins over its summary, as on a page.
	const withMeta = generateAgilityMetadata({ page, item: { ...itemWithGeo, seo: { metaDescription: "Meta" } }, url: "https://e.com/p/w" })
	assert.equal(withMeta.description, "Meta")
})

test("dynamic page item: its own seo title, canonical, robots and share image apply, the page's don't", () => {
	const own = {
		contentID: 7,
		seo: {
			title: "Widget | Example",
			canonicalUrl: "https://www.example.com/widget",
			robots: { index: true, follow: false },
			ogImage: "https://cdn.example.com/widget.png",
			metaKeywords: "widget",
		},
	}
	const m = generateAgilityMetadata({ page, item: own, url: "https://www.example.com/products/widget" })
	assert.deepEqual(m.title, { absolute: "Widget | Example" })
	assert.equal(m.alternates.canonical, "https://www.example.com/widget")
	assert.deepEqual(m.robots, { index: true, follow: false })
	assert.deepEqual(m.openGraph, { images: [{ url: "https://cdn.example.com/widget.png" }] })
	assert.equal(m.keywords, "widget")
})

test("AgilityJsonLd on a dynamic item with its own geo: item type, summary and JSON-LD only", () => {
	const json = JSON.parse(buildAgilityJsonLdString({ page, item: itemWithGeo, url: "https://www.example.com/products/widget" }))
	const [webPage] = json["@graph"]
	assert.equal(webPage["@type"], "Product")
	assert.equal(webPage.description, "The widget's own summary.")
	assert.ok(json["@graph"].some((node) => node["@id"] === "https://www.example.com/products/widget#product"))
	assert.ok(!json["@graph"].some((node) => node["@id"] === "https://www.example.com/#thing"))
})

test("AgilityJsonLd on a dynamic item with geo but no type: the page's type is the default", () => {
	const json = JSON.parse(
		buildAgilityJsonLdString({ page, item: { ...itemWithGeo, geo: { summary: "S" } }, url: "https://www.example.com/products/widget" }),
	)
	assert.equal(json["@graph"][0]["@type"], "CollectionPage")
	assert.equal(json["@graph"][0].description, "S")
	assert.equal(json["@graph"].length, 1)
})

test("hreflang alternates: BCP 47 codes, x-default, and only with two or more locales", () => {
	const m = generateAgilityMetadata({
		page: plainPage,
		url: "https://e.com/about",
		alternates: { "en-us": "https://e.com/about", "fr-ca": "https://e.com/fr-ca/a-propos" },
		defaultLocale: "en-us",
	})
	assert.deepEqual(m.alternates.languages, {
		"en-US": "https://e.com/about",
		"fr-CA": "https://e.com/fr-ca/a-propos",
		"x-default": "https://e.com/about",
	})
	const single = generateAgilityMetadata({ page: plainPage, url: "https://e.com/about", alternates: { "en-us": "https://e.com/about" } })
	assert.equal(single.alternates.languages, undefined)
})

test("resolveAgilityAlternates matches pages by pageID and dynamic items by contentID", () => {
	const sitemaps = {
		"en-us": {
			"/about": { pageID: 3, path: "/about" },
			"/posts": { pageID: 7, path: "/posts" },
			"/posts/hello": { pageID: 8, contentID: 41, path: "/posts/hello" },
			"/posts/other": { pageID: 8, contentID: 42, path: "/posts/other" },
		},
		"fr-ca": {
			"/a-propos": { pageID: 3, path: "/a-propos" },
			"/articles/bonjour": { pageID: 8, contentID: 41, path: "/articles/bonjour" },
		},
		"de-de": null,
	}
	const toUrl = (locale, path) => `https://e.com/${locale}${path}`
	assert.deepEqual(resolveAgilityAlternates({ sitemaps, pageID: 3, toUrl }), {
		"en-us": "https://e.com/en-us/about",
		"fr-ca": "https://e.com/fr-ca/a-propos",
	})
	assert.deepEqual(resolveAgilityAlternates({ sitemaps, pageID: 8, contentID: 41, toUrl }), {
		"en-us": "https://e.com/en-us/posts/hello",
		"fr-ca": "https://e.com/fr-ca/articles/bonjour",
	})
	assert.deepEqual(resolveAgilityAlternates({ sitemaps, pageID: 8, toUrl }), {})
})

test("AgilityJsonLd renders one escaped @graph script", () => {
	const html = renderToStaticMarkup(React.createElement(AgilityJsonLd, { page, url: "https://www.example.com/products", locale: "en-us" }))
	assert.match(html, /^<script type="application\/ld\+json">/)
	assert.ok(!html.includes("</script><b>"), "editor text must not close the script tag")
	const json = JSON.parse(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))
	const webPage = json["@graph"].find((node) => node["@id"] === "https://www.example.com/products#webpage")
	assert.equal(webPage["@type"], "CollectionPage")
	assert.equal(webPage.inLanguage, "en-US")
	assert.ok(json["@graph"].some((node) => node["@id"] === "https://www.example.com/#thing"))
})

test("AgilityJsonLd on a dynamic item: schemaType carries over, structuredData doesn't", () => {
	const json = JSON.parse(buildAgilityJsonLdString({ page, item, url: "https://www.example.com/products/widget" }))
	assert.equal(json["@graph"][0]["@type"], "CollectionPage")
	assert.ok(!json["@graph"].some((node) => node["@id"] === "https://www.example.com/#thing"))
})

test("AgilityJsonLd renders nothing without a page or URL", () => {
	assert.equal(renderToStaticMarkup(React.createElement(AgilityJsonLd, { page: null, url: "https://e.com/" })), "")
	assert.equal(buildAgilityJsonLdString({ page, url: "" }), null)
})

test("AgilityJsonLd passes a CSP nonce through", () => {
	const html = renderToStaticMarkup(React.createElement(AgilityJsonLd, { page: plainPage, url: "https://e.com/about", nonce: "abc" }))
	assert.match(html, /nonce="abc"/)
})
