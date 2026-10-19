# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses
[Semantic Versioning](https://semver.org/).

Each version's section becomes its GitHub release notes: the publish workflow fails
if the tagged version has no section here.

## [Unreleased]

## [16.1.0]

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

## [16.0.8] - 2025-12-19

### Changed
- Requires `next` ^16.0.10 and `@agility/content-fetch` ^2.0.11.
