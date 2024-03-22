import React, {FC} from "react"
import {ContentItem, ContentReference} from "@agility/content-fetch"
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
				let contentItemOrReference = m.item as any

				const moduleName = m.module ?? contentItemOrReference.properties?.definitionName

				let AgilityModule = null
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

				if (moduleName) {
					AgilityModule = getModule(moduleName)
				}

				if (AgilityModule) {
					return <AgilityModule key={contentItemOrReference.contentID || contentItemOrReference.contentid} {...props} />
				} else {
					if (isPreview || isDevelopmentMode) {
						return (
							<div>
								The component for{" "}
								<em>
									<strong>{m.module}</strong>
								</em>{" "}
								was not found in the Agility Modules list.
							</div>
						)
					}

					throw new Error(`Component for ${m.module} was not found in the Agility Modules list.`)
				}
			})}
		</>
	)
}
