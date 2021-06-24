# agility-next

Next.js support for Agility CMS.

This package makes it easy to get started with Agility CMS and Next.js.
Also includes support Nextjs Image using the AgilityImage component.

### Notes
The `agility` object that is passed around is either the `store` property from the Agility Sync SDK, or the `api` object of the Fetch SDK.

These objects are *nearly* identical, and can be used interchangably.

The Sync SDK is used with the local file system or build cache is available, and the Fetch SDK is used otherwise.  This is important when doing SSR or ISR mode where a serverless function is doing the work and does NOT have a local file system.