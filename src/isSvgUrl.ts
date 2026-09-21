/**
 * Determines whether a URL points at an SVG asset.
 *
 * The URL is parsed rather than string-matched, so a query string or fragment after the
 * extension does not defeat the check — `logo.svg?v=2` is still recognised as an SVG.
 * Falls back to a substring test if the value cannot be parsed as a URL.
 *
 * @param url The URL to test.
 */
export const isSvgUrl = (url: string | null | undefined): boolean => {
	if (!url) return false

	try {
		const pathname = new URL(url, "https://example.com").pathname
		return pathname.toLowerCase().endsWith(".svg")
	} catch (e) {
		return url.toLowerCase().indexOf(".svg") !== -1
	}
}
