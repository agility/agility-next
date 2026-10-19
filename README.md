# agility-next

Next.js support for Agility CMS.

This package makes it easy to get started with Agility CMS and Next.js.
Also includes support Nextjs Image using the AgilityImage component.

### Notes

The `agility` object that is passed around is the `api` object of the Fetch SDK.


## Releasing

Publishing runs in GitHub Actions (`.github/workflows/npm-publish.yml`) with npm Trusted Publishing, so no npm token is stored anywhere:

1. In a PR, bump `version` in `package.json` and move the `## [Unreleased]` notes in `CHANGELOG.md` under a new `## [<version>] - <date>` heading. Merge it.
2. Push a matching tag: `git tag v<version> && git push origin v<version>`.
3. The workflow checks the tag matches `package.json` and that `CHANGELOG.md` has a section for it, then builds, typechecks, tests, publishes to the `beta` dist-tag with provenance, and creates a GitHub pre-release with that section as its notes.
4. Once verified, promote it: `npm dist-tag add @agility/nextjs@<version> latest`.
