import agilityContentSync from "@agility/content-sync";
import agilityFileSystem from "@agility/content-sync/src/store-interface-filesystem";

export const agilityConfig = {
  guid: process.env.AGILITY_GUID, //Set your guid here
  fetchAPIKey: process.env.AGILITY_API_FETCH_KEY, //Set your fetch apikey here
  previewAPIKey: process.env.AGILITY_API_PREVIEW_KEY, //set your preview apikey
  locales: (process.env.AGILITY_LOCALES || "en-us").split(","), //the language for your website in Agility CMS
  channelName: process.env.AGILITY_SITEMAP || "website", //the name of your channel in Agility CMS
  securityKey: process.env.AGILITY_SECURITY_KEY, //the website security key used to validate and generate preview keys
  sync: process.env.AGILITY_SYNC !== "false" ? true : false, // flag to disable sync sdk and use REST API only
  rootCachePath: process.env.AGILITY_CACHEPATH || ".next/cache/agility",
};

export const getSyncClient = ({
  isPreview,
  isDevelopmentMode,
  isIncremental,
}) => {
  // we dont want to get a sync client if it has been disabled
  if (!agilityConfig.sync) {
    throw "AgilityCMS => Sync SDK has been disabled.";
  }

  const rootPath = process.cwd();

  let cachePath = `${rootPath}/${agilityConfig.rootCachePath}/${
    agilityConfig.guid
  }/${isPreview ? "preview" : "live"}`;

  //if we are in "incremental" mode on Vercel or Netlify we need to use the tmp folder...
  if (
    isIncremental &&
    (process.env.VERCEL == "1" || process.env.SITE_ID != undefined)
  ) {
    //this is the tmp folder for vercel...  if running in a regular container, the cache path can stay the same...
    cachePath = `/tmp/agilitycache/${agilityConfig.guid}/${
      isPreview ? "preview" : "live"
    }`;
  }

  const apiKey = isPreview
    ? agilityConfig.previewAPIKey
    : agilityConfig.fetchAPIKey;

  if (!agilityConfig.guid) {
    console.log("AgilityCMS => No GUID was provided.");
    return null;
  }

  return agilityContentSync.getSyncClient({
    guid: agilityConfig.guid,
    apiKey,
    isPreview,
    languages: agilityConfig.locales,
    channels: [agilityConfig.channelName],
    store: {
      interface: agilityFileSystem,
      options: {
        rootPath: cachePath,
      },
    },
  });
};

/**
 * Copy files from the main root cache path to the tmp folder if we are on a readonly file system.
 * Currently only needed on Vercel and Netlify.
 */
export const prepIncrementalMode = async () => {
  if (process.env.VERCEL != "1" && process.env.SITE_ID === undefined) return;

  const rootPath = process.cwd();

  let cachePath = `${rootPath}/${agilityConfig.rootCachePath}/`;
  const tempPath = `/tmp/agilitycache/`;

  const path = require("path");
  const fs = require("fs-extra");

  const buildFilePath = path.join(tempPath, "build.log");

  //check for the build file in here...
  if (!fs.existsSync(buildFilePath)) {
    //copy everything across from cachePath
    console.log(
      `Prepping incremental/preview mode - copying ${cachePath} to ${tempPath}`
    );
    await fs.copy(cachePath, tempPath);
  }
};
