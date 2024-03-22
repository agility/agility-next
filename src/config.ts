
export let agilityConfig = {
  guid: process.env.AGILITY_GUID, //Set your guid here
  fetchAPIKey: process.env.AGILITY_API_FETCH_KEY, //Set your fetch apikey here
  previewAPIKey: process.env.AGILITY_API_PREVIEW_KEY, //set your preview apikey
  locales: (process.env.AGILITY_LOCALES || "en-us").split(","), //the language for your website in Agility CMS
  channelName: process.env.AGILITY_SITEMAP || "website", //the name of your channel in Agility CMS
  securityKey: process.env.AGILITY_SECURITY_KEY, //the website security key used to validate and generate preview keys
  debug: process.env.AGILITY_DEBUG === "true" ? true : false,
  defaultCacheDuration: process.env.AGILITY_FETCH_CACHE_DURATION ? parseInt(process.env.AGILITY_FETCH_CACHE_DURATION) : 60, //the default cache duration in seconds for agility content
};


