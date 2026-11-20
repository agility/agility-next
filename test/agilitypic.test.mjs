// Tests for AgilityPic (src/AgilityPic.tsx). Run with `npm test`, which compiles src/ to
// .test-build/ first. They check the HTML the component emits, which is what a site sees.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const { AgilityPic } = require("../.test-build/AgilityPic.js")

const image = { label: "A photo", url: "https://cdn.example.com/x/photo.jpg", target: null, filesize: 1, width: 1920, height: 1440 }

const render = (props) => renderToStaticMarkup(React.createElement(AgilityPic, { image, ...props }))
const attr = (html, tag, name) => {
	const m = html.match(new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]*)"`))
	return m ? m[1].replace(/&amp;/g, "&") : undefined
}

// The pre-16.2 usage, as sites call it today.
const legacySources = [
	{ media: "(min-width: 1280px)", width: 800 },
	{ media: "(min-width: 640px)", width: 640 },
	{ media: "(max-width: 639px)", width: 480 },
]

// 16.1.0's exact output for its prop shapes, captured by rendering the published 16.1.0 package.
// 16.2.0 must emit the same HTML for them; the only additions allowed are listed per case.
const legacyMixed = [
	{ media: "(min-width: 1280px) and (min-resolution: 2dppx)", width: 800 },
	{ media: "(min-width: 1280px)", width: 400 },
	{ media: "(max-width: 639px)", width: 400 },
	{ media: "(min-width: 1px)", width: 300, height: 300 },
	{ media: "(min-width: 2px)", height: 500 },
	{ media: "(min-width: 3px)", type: "image/webp" },
]
const legacyMixedHtml =
	'<source media="(min-width: 1280px) and (min-resolution: 2dppx)" width="800" srcSet="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=800"/><source media="(min-width: 1280px)" width="400" srcSet="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=400"/><source media="(max-width: 639px)" width="400" srcSet="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=400"/><source media="(min-width: 1px)" width="300" height="300" srcSet="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=300&amp;h=300"/><source media="(min-width: 2px)" height="500" srcSet="https://cdn.example.com/x/photo.jpg?format=auto&amp;h=500"/><source media="(min-width: 3px)" type="image/webp" srcSet="https://cdn.example.com/x/photo.jpg"/>'
const v161 = [
	// [props, 16.1.0 HTML, 16.2.0 HTML]
	[
		{ sources: legacyMixed, fallbackWidth: 400, priority: true, className: "h-full w-full object-cover" },
		`<picture>${legacyMixedHtml}<img loading="eager" src="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=400" alt="A photo" class="h-full w-full object-cover"/></picture>`,
		// + fetchpriority="high" (no preload: there are sources)
		`<picture>${legacyMixedHtml}<img loading="eager" fetchPriority="high" src="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=400" alt="A photo" class="h-full w-full object-cover"/></picture>`,
	],
	[
		{ sources: legacyMixed, fallbackWidth: 800 },
		`<picture>${legacyMixedHtml}<img loading="lazy" src="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=800" alt="A photo"/></picture>`,
		null, // identical
	],
	[{ fallbackWidth: 640, className: "c" }, '<picture><img loading="lazy" src="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=640" alt="A photo" class="c"/></picture>', null],
	[{ alt: "Given" }, '<picture><img loading="lazy" src="https://cdn.example.com/x/photo.jpg" alt="Given"/></picture>', null],
	[{}, '<picture><img loading="lazy" src="https://cdn.example.com/x/photo.jpg" alt="A photo"/></picture>', null],
]

test("16.1.0 prop shapes render 16.1.0's HTML (plus fetchpriority with priority)", () => {
	for (const [props, before, after] of v161) assert.equal(render(props), after ?? before, JSON.stringify(props))
})

test("priority without sources: 16.1.0's HTML plus fetchpriority and a preload of the same src", () => {
	assert.equal(
		render({ fallbackWidth: 640, priority: true }),
		'<link rel="preload" href="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=640" as="image" fetchPriority="high"/><picture><img loading="eager" fetchPriority="high" src="https://cdn.example.com/x/photo.jpg?format=auto&amp;w=640" alt="A photo"/></picture>',
	)
})

test("intrinsicSize opts the 16.1.0 shapes into width/height", () => {
	const html = render({ sources: legacySources, fallbackWidth: 800, intrinsicSize: true })
	assert.match(html, /^<picture><source media="\(min-width: 1280px\)" width="800" height="600" srcSet=/)
	assert.equal(attr(html, "img", "width"), "800")
	assert.equal(attr(html, "img", "height"), "600")
	const noSize = render({ sources: [{ media: "(min-width: 1px)", type: "image/webp" }], intrinsicSize: true })
	assert.equal(attr(noSize, "source", "width"), "1920")
	assert.equal(attr(noSize, "source", "height"), "1440")
})

test("a source wider than the original is capped at the original's width; so is the fallback", () => {
	const html = render({ sources: [{ media: "(min-width: 1px)", width: 5000 }], fallbackWidth: 4000, intrinsicSize: true })
	assert.equal(attr(html, "source", "srcSet"), "https://cdn.example.com/x/photo.jpg?format=auto&w=1920")
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/photo.jpg?format=auto&w=1920")
	assert.equal(attr(html, "img", "width"), "1920")
	assert.equal(attr(html, "img", "height"), "1440")
})

test("a source with both width and height is a crop: passed as given", () => {
	const html = render({ sources: [{ media: "(min-width: 1px)", width: 300, height: 300 }] })
	assert.equal(attr(html, "source", "srcSet"), "https://cdn.example.com/x/photo.jpg?format=auto&w=300&h=300")
	assert.equal(attr(html, "source", "width"), "300")
	assert.equal(attr(html, "source", "height"), "300")
})

test("priority with sources: eager + fetchpriority=high, no preload (it can't match the media)", () => {
	const html = render({ sources: legacySources, fallbackWidth: 800, priority: true })
	assert.equal(attr(html, "img", "loading"), "eager")
	assert.equal(attr(html, "img", "fetchPriority"), "high")
	assert.ok(!html.includes("<link"))
})

test("widths + sizes: width-descriptor srcset capped at the original, and a matching preload when priority", () => {
	const html = render({ widths: [480, 960, 1920, 3840], sizes: "(min-width: 1024px) 50vw, 100vw", fallbackWidth: 960, priority: true })
	const srcset =
		"https://cdn.example.com/x/photo.jpg?format=auto&w=480 480w, https://cdn.example.com/x/photo.jpg?format=auto&w=960 960w, https://cdn.example.com/x/photo.jpg?format=auto&w=1920 1920w"
	assert.equal(attr(html, "img", "srcSet"), srcset)
	assert.equal(attr(html, "img", "sizes"), "(min-width: 1024px) 50vw, 100vw")
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/photo.jpg?format=auto&w=960")
	assert.equal(attr(html, "link", "rel"), "preload")
	assert.equal(attr(html, "link", "as"), "image")
	assert.equal(attr(html, "link", "fetchPriority"), "high")
	assert.equal(attr(html, "link", "imageSrcSet"), srcset)
	assert.equal(attr(html, "link", "imageSizes"), "(min-width: 1024px) 50vw, 100vw")
})

test("sizes alone uses the default widths, capped at the original", () => {
	const html = render({ sizes: "100vw" })
	const widths = attr(html, "img", "srcSet").split(", ").map((c) => Number(c.split(" ")[1].replace("w", "")))
	assert.deepEqual(widths, [320, 480, 640, 768, 1024, 1280, 1600, 1920])
	// No fallbackWidth: the src is the largest candidate, and width/height are the original's.
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/photo.jpg?format=auto&w=1920")
	assert.equal(attr(html, "img", "width"), "1920")
	assert.equal(attr(html, "img", "height"), "1440")
})

test("widths without sizes default sizes to 100vw", () => {
	assert.equal(attr(render({ widths: [400, 800] }), "img", "sizes"), "100vw")
})

test("priority without sources or widths preloads the src", () => {
	const html = render({ fallbackWidth: 640, priority: true })
	assert.equal(attr(html, "link", "href"), "https://cdn.example.com/x/photo.jpg?format=auto&w=640")
	assert.equal(attr(html, "link", "fetchPriority"), "high")
})

test("preload={false} keeps the priority hints but drops the preload", () => {
	const html = render({ sizes: "100vw", priority: true, preload: false })
	assert.ok(!html.includes("<link"))
	assert.equal(attr(html, "img", "fetchPriority"), "high")
})

test("quality adds q to every generated URL", () => {
	const html = render({ sources: [{ media: "(min-width: 1px)", width: 800 }], fallbackWidth: 400, widths: [400], quality: 60 })
	assert.equal(attr(html, "source", "srcSet"), "https://cdn.example.com/x/photo.jpg?format=auto&w=800&q=60")
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/photo.jpg?format=auto&w=400&q=60")
	assert.equal(attr(html, "img", "srcSet"), "https://cdn.example.com/x/photo.jpg?format=auto&w=400&q=60 400w")
})

test("standard <img> attributes pass through and can override the defaults", () => {
	const html = render({
		fallbackWidth: 400,
		decoding: "async",
		style: { aspectRatio: "1" },
		width: 200,
		height: 100,
		fetchPriority: "low",
		id: "pic",
		"data-x": "y",
	})
	assert.equal(attr(html, "img", "decoding"), "async")
	assert.equal(attr(html, "img", "style"), "aspect-ratio:1")
	assert.equal(attr(html, "img", "width"), "200")
	assert.equal(attr(html, "img", "height"), "100")
	assert.equal(attr(html, "img", "fetchPriority"), "low")
	assert.equal(attr(html, "img", "id"), "pic")
	assert.equal(attr(html, "img", "data-x"), "y")
})

test("intrinsicSize={false} leaves width and height off in the srcset mode", () => {
	const html = render({ fallbackWidth: 400, sources: [{ media: "(min-width: 1px)", width: 800 }], sizes: "100vw", intrinsicSize: false })
	assert.equal(attr(html, "img", "width"), undefined)
	assert.equal(attr(html, "img", "height"), undefined)
	assert.equal(attr(html, "source", "height"), undefined)
})

test("no dimensions on the image: no width/height, and nothing breaks", () => {
	const html = render({ image: { url: "https://cdn.example.com/x/photo.jpg" }, fallbackWidth: 400, sources: [{ media: "(min-width: 1px)", height: 300 }] })
	assert.equal(attr(html, "img", "width"), undefined)
	assert.equal(attr(html, "source", "srcSet"), "https://cdn.example.com/x/photo.jpg?format=auto&h=300")
	assert.equal(attr(html, "img", "alt"), "")
})

test("SVG: no image API query, no sources, no srcset", () => {
	const html = render({ image: { ...image, url: "https://cdn.example.com/x/logo.svg?v=2" }, fallbackWidth: 400, sources: legacySources, sizes: "100vw" })
	assert.equal(html.match(/<source/g), null)
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/logo.svg?v=2")
	assert.equal(attr(html, "img", "srcSet"), undefined)
})

test(".jfif and .jpe aren't sent through the image API (it 404s them)", () => {
	const html = render({ image: { ...image, url: "https://cdn.example.com/x/photo.jfif" }, fallbackWidth: 400 })
	assert.equal(attr(html, "img", "src"), "https://cdn.example.com/x/photo.jfif")
})

test("spaces and commas are encoded in srcset candidates", () => {
	const html = render({ image: { ...image, url: "https://cdn.example.com/x/my photo,1.jpg" }, sources: [{ media: "(min-width: 1px)", width: 800 }], widths: [400] })
	assert.equal(attr(html, "source", "srcSet"), "https://cdn.example.com/x/my%20photo%2C1.jpg?format=auto&w=800")
	assert.equal(attr(html, "img", "srcSet"), "https://cdn.example.com/x/my%20photo%2C1.jpg?format=auto&w=400 400w")
})

test("alt: explicit alt wins, alt=\"\" stays decorative, a null label gives alt=\"\"", () => {
	assert.equal(attr(render({ alt: "Given" }), "img", "alt"), "Given")
	assert.equal(attr(render({ alt: "" }), "img", "alt"), "")
	assert.equal(attr(render({ image: { ...image, label: null } }), "img", "alt"), "")
	assert.equal(attr(render({}), "img", "alt"), "A photo")
})

test("no image, or an image without a url, renders nothing", () => {
	assert.equal(render({ image: null }), "")
	assert.equal(render({ image: { url: "" } }), "")
})
