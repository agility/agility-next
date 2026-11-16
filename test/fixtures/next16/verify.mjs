// Fetches the fixture's pages from a running `next start` and checks the HTML.
const base = process.argv[2] || "http://localhost:3999"
const react = process.argv[3] || ""
const reactMajor = Number(react.split(".")[0] || 19)
let failed = 0
const check = (name, ok) => {
	console.log(`${ok ? "ok  " : "FAIL"} ${name}`)
	if (!ok) failed++
}
const tag = (html, id) => (html.match(new RegExp(`<img[^>]*id="${id}"[^>]*>`)) || [""])[0]

// React 18 has no App Router route (run.sh removes app/) and no ReactDOM.preload.
const routes = reactMajor >= 19 ? [["/", true], ["/legacy", true]] : [["/legacy", false]]
for (const [route, expectPreload] of routes) {
	const html = await (await fetch(base + route)).text()
	const lcp = tag(html, "lcp")
	const legacy = tag(html, "legacy")
	check(`${route}: lcp img fetchpriority=high`, /fetch[pP]riority="high"/.test(lcp))
	check(`${route}: lcp img eager`, /loading="eager"/.test(lcp))
	check(`${route}: lcp img srcset with w descriptors, capped at 1920`, /srcSet="[^"]*w=1920 1920w"/.test(lcp) && !/w=3840/.test(lcp))
	check(`${route}: lcp img sizes`, /sizes="100vw"/.test(lcp))
	check(`${route}: lcp img width/height`, /width="960"/.test(lcp) && /height="540"/.test(lcp))
	const preload = /<link rel="preload"[^>]*as="image"[^>]*imageSrcSet="[^"]*hero\.jpg[^"]*1920w"[^>]*>/i.test(html) || /<link rel="preload"[^>]*imageSrcSet="[^"]*hero\.jpg[^"]*1920w"[^>]*as="image"[^>]*>/i.test(html)
	if (expectPreload) check(`${route}: preload link for the lcp image`, preload)
	else console.log(`skip ${route}: preload (React ${react} has no ReactDOM.preload)`)
	check(`${route}: legacy img is lazy, no fetchpriority, no width/height`, /loading="lazy"/.test(legacy) && !/fetch[pP]riority/i.test(legacy) && !/ width=/.test(legacy))
	check(`${route}: legacy sources`, html.includes('srcSet="https://cdn.example.com/x/card.jpg?format=auto&amp;w=640"'))
	check(`${route}: AgilityImage rendered`, /<img[^>]*id="nextimage"/.test(html))
	check(`${route}: ContentZone + renderHTML`, html.includes("<p>Zone content</p>"))
}
if (failed) {
	console.log(`${failed} check(s) failed`)
	process.exit(1)
}
