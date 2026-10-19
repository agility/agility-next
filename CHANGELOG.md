# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses
[Semantic Versioning](https://semver.org/).

Each version's section becomes its GitHub release notes: the publish workflow fails
if the tagged version has no section here.

## [Unreleased]

### Changed
- Releases are published from CI (npm Trusted Publishing, with provenance) when a
  `v<version>` tag is pushed, always under the `beta` dist-tag. Each release also
  gets a GitHub release whose notes come from this file.
- `package-lock.json` is regenerated so `npm ci` installs, and `yarn.lock` is removed:
  the repo builds and publishes with npm.

## [16.0.8] - 2025-12-19

### Changed
- Requires `next` ^16.0.10 and `@agility/content-fetch` ^2.0.11.
