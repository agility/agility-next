# agility-next

Next.js support for Agility CMS.

This package makes it easy to get started with Agility CMS and Next.js.
Also includes support Nextjs Image using the AgilityImage component.

### Notes

The `agility` object that is passed around is either the `store` property from the Agility Sync SDK, or the `api` object of the Fetch SDK.

These objects are _nearly_ identical, and can be used interchangably.

By default, this will use the REST API, however a local filesytem sync can be enabled by setting an environment variable called `AGILITY_SYNC=true`.

If the Sync SDK is enabled and a local file system is unavailable, it will fallback to using the REST API. This is important when doing SSR or ISR mode where a serverless function is doing the work and does NOT have a local file system.

As of version `0.4.0`, the REST API is used by deafult.

