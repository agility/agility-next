
const fs = require('fs')

require("dotenv").config({
	path: `.env.local`,
})

const { getSyncClient, agilityConfig  } = require('./config')

const runSync = async () => {
	setBuildLog(false)

	const agilitySyncClient = getSyncClient({ isPreview: true, isDevelopmentMode: true })
	if (!agilitySyncClient) {
		console.log("AgilityCMS => Sync client could not be accessed.")
		return;
	}

	await agilitySyncClient.runSync();
}

const setBuildLog = (builtYN) => {
	//clear out a file saying WE HAVE SYNC'D
	const rootPath = process.cwd()

	const filePath = `${rootPath}/${agilityConfig.rootCachePath}/build.log`

console.log("setBuildLog", {builtYN, filePath})

	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}

	if (builtYN) {
		//write out the build log so we know that we are up to date
		fs.writeFileSync(filePath, "BUILT");
	} else {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	}
}

const preBuild = async () => {

	//clear the build log
	setBuildLog(false)

	//sync preview mode
	let agilitySyncClient = getSyncClient({ isPreview: true, isDevelopmentMode: false })
	if (!agilitySyncClient) {
		console.log("AgilityCMS => Sync client could not be accessed.")
		return;
	}

	await agilitySyncClient.runSync();

	//sync production mode
	agilitySyncClient = getSyncClient({ isPreview: false, isDevelopmentMode: false })
	if (!agilitySyncClient) {
		console.log("AgilityCMS => Sync client could not be accessed.")
		return;
	}

	await agilitySyncClient.runSync();


}

const postBuild = async () => {
	//mark the build log as BUILT
	setBuildLog(true)
}

const cleanSync = async () => {

	setBuildLog(false)

	const agilitySyncClient = getSyncClient({ isPreview: true, isDevelopmentMode: true })
	if (!agilitySyncClient) {
		console.log("AgilityCMS => Sync client could not be accessed.")
		return;
	}
	await agilitySyncClient.clearSync();

}


export const cli = (argv:string[]) => {

	let arg = "sync"
	if (argv.length >= 3) arg = argv[2].toLowerCase()

	switch (arg) {
		case "clean":
			//clean everything
			cleanSync();
			break;
		case "sync":
			//run the sync
			runSync()
			break;
		case "prebuild":
			//pre build actions
			preBuild()
			break;

		case "postbuild":
			//post build actions
			postBuild()
			break;
		}
}