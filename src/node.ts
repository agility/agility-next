import { asyncForEach } from "./utils";

import { AgilityGetStaticPropsContext, ModuleWithInit } from "./types";

//Agility API stuff
import { agilityConfig } from "./config";
import { AgilityPageProps } from "./types";
import agilityRestAPI, { Page } from "@agility/content-fetch";
import { ContentZone } from "@agility/content-fetch/dist/types/ContentZone";

const securityKey = agilityConfig.securityKey;
const channelName = agilityConfig.channelName;

const isDevelopmentMode = process.env.NODE_ENV === "development";

const getAgilityPageProps = async ({
	params,
	preview,
	locale,
	defaultLocale,
	getModule,
	globalComponents,
	apiOptions,
}: AgilityGetStaticPropsContext): Promise<AgilityPageProps> => {
	//set default API Options
	const defaultAPIOptions = {
		onSitemapRetrieved: null,
		expandAllContentLinks: true,
		contentLinkDepth: 3,
	};

	apiOptions = { ...defaultAPIOptions, ...apiOptions };

	//use locale or defaultLocale if it's provided for languageCode
	let languageCode = (
		locale ||
		defaultLocale ||
		agilityConfig.locales[0]
	).toLowerCase();

	let path = "/";
	if (params) {
		//build path by iterating through slugs
		path = "";
		if (params.slug instanceof String) {
			//slug is a flat string...
			path = params.slug as string;
		} else {
			//slug is a string array (more likely)
			const slugAry: [string] = params.slug as [string];
			slugAry.map((slug: string) => {
				path += "/" + slug;
			});
		}
	}

	let isPreview: boolean = preview || isDevelopmentMode;
	let isDebugMode = agilityConfig.debug || isDevelopmentMode

	if (isDebugMode) {
		console.log(`AgilityCMS => getAgilityPageProps [${languageCode}] [${path}]`);
	}

	const agilityRestClient = agilityRestAPI.getApi({
		guid: agilityConfig.guid,
		apiKey: isPreview
			? agilityConfig.previewAPIKey
			: agilityConfig.fetchAPIKey,
		isPreview,
		debug: agilityConfig.debug,
	});

	//get sitemap
	let sitemap = await agilityRestClient.getSitemapFlat({
		channelName,
		languageCode,
	});

	if (apiOptions && apiOptions.onSitemapRetrieved) {
		apiOptions.onSitemapRetrieved({ sitemap, isPreview, isDevelopmentMode });
	}

	if (sitemap === null) {
		console.warn(`AgilityCMS => No sitemap found on sitemap channel '${channelName}.'`);
	}

	let pageInSitemap = null;
	let page: Page;
	let dynamicPageItem: any = null;

	if (path === "/") {
		//home page
		let firstPagePathInSitemap = Object.keys(sitemap)[0];
		pageInSitemap = sitemap[firstPagePathInSitemap];
	} else {
		//all other pages
		pageInSitemap = sitemap[path];
	}

	let notFound = false;

	if (pageInSitemap) {
		//get the page
		page = await agilityRestClient.getPage({
			pageID: pageInSitemap.pageID,
			languageCode: languageCode,
			contentLinkDepth: apiOptions.contentLinkDepth,
			expandAllContentLinks: apiOptions.expandAllContentLinks,
		});

	} else {
		//Could not find page
		console.warn(`AgilityCMS => Page [${path}] not found in sitemap channel '${channelName}.' .`);
		notFound = true;
	}

	if (!page && pageInSitemap) {
		console.warn(`AgilityCMS => page [${path}] with id [${pageInSitemap.pageID}] was not able to be accessed.`);
		notFound = true;
	}

	//resolve data for other shared components
	const globalData: { [name: string]: any } = {};
	if (globalComponents) {
		const keys = Object.keys(globalComponents);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			try {

				const fnc = globalComponents[key].getCustomInitialProps;
				if (fnc) {
					if (isDebugMode) {
						console.log(
							`AgilityCMS => Fetching global data for ${key}...`
						);
					}

					const retData = await fnc({
						agility: agilityRestClient,
						languageCode,
						channelName,
						page,
						sitemapNode: pageInSitemap,
						dynamicPageItem,
					});

					globalData[key] = retData;
				}
			} catch (error) {
				throw new Error(
					`AgilityCMS => Error calling global data function ${key}: ${error}`
				);
			}
		}
	}

	let pageTemplateName = null;

	if (!notFound) {
		//if there is a dynamic page content id on this page, grab it...
		if (pageInSitemap.contentID > 0) {
			dynamicPageItem = await agilityRestClient.getContentItem({
				contentID: pageInSitemap.contentID,
				languageCode: languageCode,
			});

		}

		//resolve the page template
		pageTemplateName = page.templateName.replace(/[^0-9a-zA-Z]/g, "");

		//resolve the modules per content zone
		await asyncForEach(Object.keys(page.zones), async (zoneName: string) => {
			let modules: ContentZone[] = [];

			//grab the modules for this content zone
			const modulesForThisContentZone = page.zones[zoneName];

			//loop through the zone's modules
			await asyncForEach(
				modulesForThisContentZone,
				async (moduleItem: { module: string; item: any; customData: any }) => {
					//find the react component to use for the module
					const moduleComponent = getModule(moduleItem.module);

					if (moduleComponent && moduleComponent.getCustomInitialProps) {
						//resolve any additional data for the modules

						//we have some additional data in the module we'll need, execute that method now, so it can be included in SSG
						if (isDebugMode) {
							console.log(
								`AgilityCMS => Fetching additional data for ${moduleItem.module}...`
							);
						}

						try {
							const moduleData = await moduleComponent.getCustomInitialProps({
								page,
								item: moduleItem.item,
								agility: agilityRestClient,
								languageCode,
								channelName,
								sitemapNode: pageInSitemap,
								dynamicPageItem,
							});

							//if we have additional module data, then add it to the module props using 'customData'
							if (moduleData != null) {
								moduleItem.customData = moduleData;
							}
						} catch (error) {
							throw new Error(
								`AgilityCMS => Error getting custom data for module ${moduleItem.module}: ${error}`
							);
						}
					}

					modules.push({
						module: moduleItem.module,
						item: moduleItem.item,
						customData: moduleItem.customData || null,
					});
				}
			);

			//store as dictionary
			page.zones[zoneName] = modules;
		});
	}

	return {
		sitemapNode: pageInSitemap || null,
		page,
		dynamicPageItem,
		pageTemplateName,
		globalData,
		languageCode,
		channelName,
		isPreview,
		isDevelopmentMode,
		notFound,
	};
};

const getAgilityPaths = async ({
	preview,
	locales,
	defaultLocale,
}): Promise<string[]> => {
	//determine if we are in preview mode
	const isPreview = isDevelopmentMode || preview;

	if (!defaultLocale) defaultLocale = agilityConfig.locales[0];
	if (!locales) locales = agilityConfig.locales;

	// set up rest client
	const agilityRestClient = agilityRestAPI.getApi({
		guid: agilityConfig.guid,
		apiKey: isPreview ? agilityConfig.previewAPIKey : agilityConfig.fetchAPIKey,
		isPreview,
		debug: agilityConfig.debug,
	});

	let paths: string[] = [];

	for (let i = 0; i < locales.length; i++) {
		const languageCode = locales[i].toLowerCase();

		console.log("AgilityCMS => `getAgilityPaths` *** USING REST API ***");
		let sitemapFlat = await agilityRestClient.getSitemapFlat({
			channelName,
			languageCode,
		});

		if (!sitemapFlat) {
			console.warn(
				`AgilityCMS => No Sitemap found for locale ${languageCode}.  Make sure your locales and environment variables are setup correctly.`
			);
			continue;
		}

		//returns an array of paths as a string (i.e.  ['/home', '/posts'] )
		const thesePaths = Object.keys(sitemapFlat).filter((path) => {
			const sitemapNode = sitemapFlat[path];
			return !sitemapNode.redirect && !sitemapNode.isFolder;
		});

		if (languageCode !== defaultLocale.toLowerCase()) {
			//prepend
			paths = paths.concat(thesePaths.map((path) => `/${languageCode}${path}`));
		} else {
			paths = paths.concat(thesePaths);
		}
	}

	return paths;
};

const validatePreview = async ({ agilityPreviewKey, slug }: any) => {
	//Validate the preview key
	if (!agilityPreviewKey) {
		return {
			error: true,
			message: `Missing agilitypreviewkey.`,
		};
	}

	//sanitize incoming key (replace spaces with '+')
	if (agilityPreviewKey.indexOf(` `) > -1) {
		agilityPreviewKey = agilityPreviewKey.split(` `).join(`+`);
	}

	//compare the preview key being used
	const correctPreviewKey = generatePreviewKey();

	if (agilityPreviewKey !== correctPreviewKey) {
		return {
			error: true,
			message: `Invalid agilitypreviewkey.`,
			//message: `Invalid agilitypreviewkey. Incoming key is=${agilityPreviewKey} compared to=${correctPreviewKey}...`
		};
	}

	//return success
	return {
		error: false,
		message: null,
	};
};

const generatePreviewKey = () => {
	//the string we want to encode
	const str = `-1_${securityKey}_Preview`;

	//build our byte array
	let data = [];
	for (var i = 0; i < str.length; ++i) {
		data.push(str.charCodeAt(i));
		data.push(0);
	}

	//convert byte array to buffer
	const strBuffer = Buffer.from(data);

	//encode it!
	const crypto = require("crypto");
	const previewKey = crypto
		.createHash("sha512")
		.update(strBuffer)
		.digest("base64");
	return previewKey;
};

const getDynamicPageURL = async ({ contentID, preview, slug }) => {
	console.log(`Agility CMS => Retrieving Dynamic Page URL by ContentID...`);

	//determine if we are in preview mode
	const isPreview = preview || isDevelopmentMode;

	const languageCode = agilityConfig.locales[0];

	//TODO: check to see if this slug starts with a language code, and IF SO we need to use that languageCode...

	const agilityRestClient = agilityRestAPI.getApi({
		guid: agilityConfig.guid,
		apiKey: isPreview ? agilityConfig.previewAPIKey : agilityConfig.fetchAPIKey,
		isPreview,
		debug: agilityConfig.debug,
	});

	const sitemapFlat = await agilityRestClient.getSitemapFlat({
		channelName,
		languageCode,
	});

	const dynamicPaths = Object.keys(sitemapFlat).filter((s) => {
		if (sitemapFlat[s].contentID == contentID) {
			return s;
		}
	});

	if (dynamicPaths.length > 0) {
		return dynamicPaths[0]; //return the first one found
	} else {
		return null; //no dynamic path
	}
};

export {
	getAgilityPageProps,
	getAgilityPaths,
	validatePreview,
	generatePreviewKey,
	getDynamicPageURL,
};
