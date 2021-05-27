import React, { FC } from 'react';
import { ContentZoneProps } from './types';


export const ContentZone:FC<ContentZoneProps> = ({ name, page, pageInSitemap, dynamicPageItem, languageCode, channelName, getModule, isDevelopmentMode, isPreview }) => {

	const RenderModules = () => {
		if (!page) return null

		let modules = page.zones[name];

		const modulesToRender = modules.map(m => {

			const AgilityModule = getModule(m.moduleName)

			let props = {
				 page,
				 pageInSitemap,
				 dynamicPageItem,
				 module: m.item,
				 languageCode,
				 channelName,
				 customData: m.customData || null,
				 isDevelopmentMode,
				 isPreview

			}

			if (AgilityModule) {
				return <AgilityModule  key={m.item.contentID} { ... props} />
			} else {
				throw new Error(`React Component for ${m.moduleName} was not found in the Agility Modules list.`)
			}

		})

		return modulesToRender;
	}


	return (
		<RenderModules />
	)
}
