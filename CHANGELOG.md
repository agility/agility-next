# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses
[Semantic Versioning](https://semver.org/).

Each version's section becomes its GitHub release notes: the publish workflow fails
if the tagged version has no section here.

## [Unreleased]

## [16.2.0] - 2026-11-16

`AgilityPic` can now win the Largest Contentful Paint: it prioritizes and preloads the LCP image,
lets the browser pick the right width, and reserves the image's space. Existing `sources`,
`fallbackWidth`, `priority`, `alt` and `className` usage renders 16.1.0's HTML, plus `fetchpriority="high"`
(and a preload) on a `priority` image. The only values that differ are the fallback width cap under
*Changed* and the fixes under *Fixed*.

### Added
- `AgilityPic` `sizes` and `widths`: a width-descriptor `srcset` on the `<img>` (`…?format=auto&w=640 640w, …`),
  so the browser picks the file for the drawn size and the screen density. Widths above the original's
  width are capped to it (the image API upscales). `sizes` alone uses a default set of widths (exported as `AGILITY_PIC_DEFAULT_WIDTHS`).
- `AgilityPic` `priority` now also emits `fetchpriority="high"`, and a `<link rel="preload" as="image">`
  (React 19 `preload()`) that matches the `<img>`'s `src`, `srcset` and `sizes`. No preload is emitted
  when `sources` are given, because it can't follow `<source>` media matching. `preload={false}` turns it off.
- `AgilityPic` passes standard `<img>` attributes through (`decoding`, `fetchPriority`, `loading`, `width`,
  `height`, `style`, `id`, `data-*`, …); they win over the component's defaults.
- `AgilityPic` `quality`: sent to the image API as `q`.
- `AgilityPic` `intrinsicSize`: `width` and `height` on the `<img>` (the `src`'s width at the original's
  aspect ratio) and the matching size on each `<source>`, so the browser reserves the space (no layout
  shift). On by default with `sizes`/`widths`, off by default otherwise so existing pages are unchanged.
- Tests for `AgilityPic`'s HTML (`test/agilitypic.test.mjs`), including 16.1.0's exact output for its
  prop shapes.

### Changed
- Supports every Next.js 16 release: the `next` peer dependency is `^16.0.0` (was `^16.0.10`), and `react`
  and `react-dom` are declared as `^18.2.0 || ^19.0.0`, matching what Next 16 accepts. Nothing in the
  package depends on a Next 16 minor. Verified by building a fixture app on Next 16.0.0 with React 19.2.0
  and with React 18.2.0 (Pages Router), on Next 16.2.12 with React 19.2.9, and on Next 16.4.6 with
  React 19.3.1; the new `next-compat` workflow runs that matrix on every pull request. Keep Next on a
  patched release (16.0.7 and later fix CVE-2025-66478).
- On React 18, `AgilityPic` writes `fetchpriority` in lower case (React 18 doesn't know the camelCase
  prop) and skips the preload (`ReactDOM.preload()` is React 19).
- `AgilityPic`'s `fallbackWidth` is capped at the original's width, as the `sources` already were
  (the image API upscales, so a larger width only added bytes).
- `AgilityPic`'s `image` prop accepts any object with a `url` (`label`, `width` and `height` optional,
  `label` may be `null`); an `ImageField` still fits.

### Fixed
- `AgilityPic` no longer sends SVGs through the image API (`format=auto` rasterized them), and skips
  `sources` for them. `.jfif` and `.jpe` files, which the image API returns a 404 for, are skipped the same way.
- `AgilityPic`'s `<img>` always has an `alt`: the `alt` prop, then the label, then `""`. An explicit
  `alt=""` (decorative) is kept instead of falling back to the label.
- `AgilityPic` renders nothing, instead of throwing, when `image` or its `url` is missing.
- Spaces and commas in an image's file name are encoded in `srcset` candidates; they split the candidate
  and the browser requested a broken URL.

## [16.1.0] - 2026-11-09

### Added
- `@agility/nextjs/geo`, a new entry point for structured data and AI search (GEO / AEO). It
  needs `@agility/geo` (an optional peer dependency, `>=0.1.0 <1`) installed alongside; the rest
  of the package doesn't.
  - `generateAgilityMetadata()` turns a page's `seo` and `geo` properties into Next.js metadata:
    title (an editor's SEO title as-is, otherwise a fallback through `titleTemplate`),
    description (falling back to `geo.summary`), keywords, canonical URL, robots, share image and
    `hreflang` alternates with `x-default`. A site-relative canonical URL or share image is
    resolved against the page's URL, and the fallback canonical drops the query string and
    fragment.
  - `<AgilityJsonLd />` (and `buildAgilityJsonLdString()`) renders one escaped schema.org
    `@graph` script, built by `@agility/geo`: a WebPage typed by `geo.schemaType`, a
    BreadcrumbList from a flat sitemap, and the editor's `geo.structuredData`. It takes a CSP
    `nonce`, site settings and a `transform` hook.
  - `resolveAgilityAlternates()` finds each locale's URL for a page, or a dynamic page's item,
    from each locale's flat sitemap.
  - Dynamic pages: pass the item. Its `geo.schemaType`, `seo.robots` and `geo.ai` properties fall
    back to the dynamic page's; its title, canonical URL, share image, description, summary and
    structured data are its own only, so the dynamic page's (which describe the listing) are never
    applied to its items.

### Changed
- Releases are published from CI (npm Trusted Publishing, with provenance) when a
  `v<version>` tag is pushed, always under the `beta` dist-tag. Each release also
  gets a GitHub release whose notes come from this file.
- `package-lock.json` is regenerated so `npm ci` installs, and `yarn.lock` is removed:
  the repo builds and publishes with npm.
- The `@agility/content-fetch` peer dependency is now `^2.0.14`, the first release with the
  `geo` types on `Page` and `ContentItem` that `@agility/nextjs/geo` reads.

## [16.0.8] - 2025-12-19

### Changed
- Requires `next` ^16.0.10 and `@agility/content-fetch` ^2.0.11.
