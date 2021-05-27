import { asyncForEach } from "./utils"

import { AgilityGetStaticPropsContext, ModuleWithInit } from "./types"

//Agility API stuff
import { agilityConfig, getSyncClient, prepIncrementalMode } from './config'
import { AgilityPageProps } from "./types"
import agilityRestAPI from '@agility/content-fetch'

const securityKey = agilityConfig.securityKey
const channelName = agilityConfig.channelName

const isDevelopmentMode = process.env.NODE_ENV === "development"


const getAgilityPageProps = async ({ params, preview, locale, defaultLocale, getModule, globalComponents }: AgilityGetStaticPropsContext): Promise<AgilityPageProps> => {

	//use locale or defaultLocale if it's provided for languageCode
	let languageCode = (locale || defaultLocale || agilityConfig.locales[0]).toLowerCase()

	let path = '/';
	if (params) {
		//build path by iterating through slugs
		path = '';
		if (params.slug instanceof String) {
			//slug is a flat string...
			path = params.slug as string
		} else {
			//slug is a string array (more likely)
			const slugAry: [string] = params.slug as [string]
			slugAry.map((slug: string) => {
				path += '/' + slug
			})
		}
	}

	const fs = require("fs-extra")

	let agilitySyncClient = null
	let agilityRestClient = null
	let isPreview: boolean = (preview || isDevelopmentMode);

	//determine if we have access to the sync folder
	const buildFolder = `${process.cwd()}/${agilityConfig.rootCachePath}`
	const buildFilePath = `${buildFolder}/build.log`
	const isBuildComplete = fs.existsSync(buildFilePath)
	//HACK
	if ((!fs.existsSync(buildFolder))) {
		/* *** SYNC NOT AVAILABLE *** */
		//the build folder does not exist, can't use sync client...
console.warn("*** SYNC NOT AVAILABLE - USING REST API ***")

		agilityRestClient = agilityRestAPI.getApi({
			guid: agilityConfig.guid,
			apiKey: isPreview ? agilityConfig.previewAPIKey : agilityConfig.fetchAPIKey,
			isPreview
		});


	} else {
		/* *** SYNC AVAILABLE *** */

		//determine if we've already done a full build yet

		agilitySyncClient = getSyncClient({
			isPreview: isPreview,
			isDevelopmentMode,
			isIncremental: isBuildComplete
		});

		if (!agilitySyncClient) {
			console.log("AgilityCMS => Sync client could not be accessed.")
			return {
				notFound: true
			};
		}

		if (preview || isBuildComplete) {
			//only do on-demand sync in next's preview mode or incremental build...
			console.log(`AgilityCMS => Sync On-demand ${isPreview ? "Preview" : "Live"} Mode`)

			await prepIncrementalMode()
			await agilitySyncClient.runSync();
		}
	}

	//get sitemap
	let sitemap = null
	if (agilitySyncClient) {
		sitemap = await agilitySyncClient.store.getSitemap({ channelName, languageCode });
	} else {
		sitemap = await agilityRestClient.getSitemapFlat({ channelName, languageCode })
	}

	if (sitemap === null) {
		console.warn("No sitemap found after sync.");
	}

	let pageInSitemap = null
	let page: any = null;
	let dynamicPageItem: any = null;

	if (path === '/') {
		//home page
		let firstPagePathInSitemap = Object.keys(sitemap)[0];
		pageInSitemap = sitemap[firstPagePathInSitemap];
	} else {
		//all other pages
		pageInSitemap = sitemap[path];
	}

	if (pageInSitemap) {
		//get the page
		if (agilitySyncClient) {
			page = await agilitySyncClient.store.getPage({
				pageID: pageInSitemap.pageID,
				languageCode: languageCode
			});
		} else {
			page = await agilityRestClient.getPage({
				pageID: pageInSitemap.pageID,
				languageCode: languageCode,
				contentLinkDepth: 3
			});
		}

	} else {
		//Could not find page
		console.warn('page [' + path + '] not found in sitemap.');
		return {
			notFound: true
		};
	}

	if (!page) {
		console.warn('page [' + path + '] not found in getpage method.');
		return {
			notFound: true
		};
	}


	//if there is a dynamic page content id on this page, grab it...
	if (pageInSitemap.contentID > 0) {
		if (agilitySyncClient) {
			dynamicPageItem = await agilitySyncClient.store.getContentItem({
				contentID: pageInSitemap.contentID,
				languageCode: languageCode
			});
		} else {
			dynamicPageItem = await agilityRestClient.getContentItem({
				contentID: pageInSitemap.contentID,
				languageCode: languageCode
			})
		}
	}

	//resolve the page template
	const pageTemplateName = page.templateName.replace(/[^0-9a-zA-Z]/g, '');

	//resolve the modules per content zone
	await asyncForEach(Object.keys(page.zones), async (zoneName: string) => {

		let modules: { moduleName: string; item: any, customData: any }[] = [];

		//grab the modules for this content zone
		const modulesForThisContentZone = page.zones[zoneName];

		//loop through the zone's modules
		await asyncForEach(modulesForThisContentZone, async (moduleItem: { module: string, item: any, customData: any }) => {

			//find the react component to use for the module
			const moduleComponent = getModule(moduleItem.module)

			if (moduleComponent && moduleComponent.getCustomInitialProps) {
				//resolve any additional data for the modules

				//we have some additional data in the module we'll need, execute that method now, so it can be included in SSG
				if (isDevelopmentMode) {
					console.log(`AgilityCMS => Fetching additional data via getCustomInitialProps for ${moduleItem.module}...`);
				}

				try {
					const moduleData = await moduleComponent.getCustomInitialProps({
						page,
						item: moduleItem.item,
						agility: agilitySyncClient ? agilitySyncClient.store : agilityRestClient,
						languageCode,
						channelName,
						pageInSitemap,
						dynamicPageItem
					});

					//if we have additional module data, then add it to the module props using 'customData'
					if (moduleData != null) {
						moduleItem.customData = moduleData;
					}
				} catch (error) {
					throw new Error(`AgilityCMS => Error get custom data for module ${moduleItem.module}: ${error}`)
				}
			}

			modules.push({
				moduleName: moduleItem.module,
				item: moduleItem.item,
				customData: moduleItem.customData || null
			})
		})


		//store as dictionary
		page.zones[zoneName] = modules;

	})


	//resolve data for other shared components
	const globalData: { [name: string]: any } = {}
	if (globalComponents) {
		const keys = Object.keys(globalComponents)
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			try {
				const fnc = globalComponents[key].getCustomInitialProps

				const retData = await fnc({
					agility: agilitySyncClient ? agilitySyncClient.store : agilityRestClient,
					languageCode,
					channelName,
					page,
					pageInSitemap,
					dynamicPageItem
				});

				globalData[key] = retData
			} catch (error) {
				throw new Error(`AgilityCMS => Error calling global data function ${key}: ${error}`)
			}

		}
	}

	return {
		sitemapNode: pageInSitemap,
		page,
		dynamicPageItem,
		pageTemplateName,
		globalData,
		languageCode,
		channelName,
		isPreview,
		isDevelopmentMode
	}
}

const getAgilityPaths = async ({ preview, locales, defaultLocale }): Promise<string[]> => {

	//determine if we are in preview mode
	const isPreview = isDevelopmentMode || preview;

	if (!defaultLocale) defaultLocale = agilityConfig.locales[0]
	if (!locales) locales = agilityConfig.locales

	const fs = require("fs-extra")

	//determine if we've already done a full build yet
	const buildFilePath = `${process.cwd()}/${agilityConfig.rootCachePath}/build.log`
	const isBuildComplete = fs.existsSync(buildFilePath)

	const agilitySyncClient = getSyncClient({
		isPreview,
		isDevelopmentMode,
		isIncremental: isBuildComplete
	});

	if (!agilitySyncClient) {
		console.log("AgilityCMS => Sync client could not be accessed.")
		return [];
	}


	let paths: string[] = []

	for (let i = 0; i < locales.length; i++) {
		const languageCode = locales[i].toLowerCase()

		const sitemapFlat = await agilitySyncClient.store.getSitemap({
			channelName,
			languageCode
		})

		if (!sitemapFlat) {
			console.warn(`AgilityCMS => No Sitemap found for locale ${languageCode}.  Make sure your locales and environment vars are setup correctly.`)
			continue
		}

		//returns an array of paths as a string (i.e.  ['/home', '/posts'] )

		const thesePaths = Object.keys(sitemapFlat)
			.filter(path => {
				const sitemapNode = sitemapFlat[path]
				return !sitemapNode.redirect
					&& !sitemapNode.isFolder
			})

		if (languageCode !== defaultLocale.toLowerCase()) {
			//prepend
			paths = paths.concat(thesePaths.map(path => `/${languageCode}${path}`))

		} else {
			paths = paths.concat(thesePaths)
		}
	}

	return paths
}


const validatePreview = async ({ agilityPreviewKey, slug }: any) => {
	//Validate the preview key
	if (!agilityPreviewKey) {
		return {
			error: true,
			message: `Missing agilitypreviewkey.`
		}
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
			message: `Invalid agilitypreviewkey.`
			//message: `Invalid agilitypreviewkey. Incoming key is=${agilityPreviewKey} compared to=${correctPreviewKey}...`
		}
	}

	//return success
	return {
		error: false,
		message: null
	}

}

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
	const crypto = require('crypto')
	const previewKey = crypto.createHash('sha512').update(strBuffer).digest('base64');
	return previewKey;
}


const getDynamicPageURL = async ({ contentID, preview, slug }) => {
	console.log(`Agility CMS => Retrieving Dynamic Page URL by ContentID...`);

	//determine if we are in preview mode
	const isPreview = preview || isDevelopmentMode;

	const languageCode = agilityConfig.locales[0]

	//TODO: check to see if this slug starts with a language code, and IF SO we need to use that languageCode...

	const agilityRestClient = agilityRestAPI.getApi({
		guid: agilityConfig.guid,
		apiKey: isPreview ? agilityConfig.previewAPIKey : agilityConfig.fetchAPIKey,
		isPreview
	});

	const sitemapFlat = await agilityRestClient.getSitemap({
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
}



export {
	getAgilityPageProps,
	getAgilityPaths,
	validatePreview,
	generatePreviewKey,
	getDynamicPageURL
}

