import React, {FC} from "react"
import {ContentZoneProps} from "./types"

export const ContentZone: FC<ContentZoneProps> = ({
	name,
	page,
	sitemapNode,
	dynamicPageItem,
	languageCode,
	channelName,
	getModule,
	isDevelopmentMode,
	isPreview,
	globalData,
}) => {
	if (!page) return null

	const modules = page.zones[name]

	return (
		<>
			{modules.map((m) => {
				const AgilityModule = getModule(m.moduleName)

				let props = {
					page,
					sitemapNode,
					dynamicPageItem,
					module: m.item,
					languageCode,
					channelName,
					customData: m.customData || null,
					isDevelopmentMode,
					isPreview,
					globalData: globalData,
				}

				if (AgilityModule) {
					return <AgilityModule key={m.item.contentID} {...props} />
				} else {
					if (isPreview || isDevelopmentMode) {
						return (
							<div>
								The component for{" "}
								<em>
									<strong>{m.moduleName}</strong>
								</em>{" "}
								was not found in the Agility Modules list.
							</div>
						)
					}

					throw new Error(`Component for ${m.moduleName} was not found in the Agility Modules list.`)
				}
			})}
		</>
	)
}
