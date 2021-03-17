import React, { Component } from 'react';

 function ContentZone({ name, page, dynamicPageItem, languageCode, channelName, getModule }) {
	function RenderModules() {

		if (!page) return null

		let modules = page.zones[name];

		const modulesToRender = modules.map(m => {

			const AgilityModule = getModule(m.moduleName)

			let props = {
				 page,
				 dynamicPageItem,
				 module: m.item,
				 languageCode,
				 channelName,
				 customData: m.customData || null
			}

			if (AgilityModule) {
				return <AgilityModule  key={m.item.contentID} { ... props} />
			} else {
				console.error(`React Component for ${m.moduleName} was not found in the Agility Modules list.`)
			}

		})

		return modulesToRender;
	}


	return (
		<div>
			<RenderModules />
		</div>
	)
}

export default ContentZone