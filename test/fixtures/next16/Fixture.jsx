import React from "react"
import { AgilityPic, ContentZone } from "@agility/nextjs"
import NextImage from "./NextImage"
import Text from "./Text"
import { hero, card, page } from "./fixture-data"

const getModule = (name) => (name === "Text" ? Text : null)

// The main exports: AgilityPic (LCP mode and 16.1.0 sources mode), AgilityImage, ContentZone, renderHTML.
export default function Fixture() {
	return (
		<main>
			<AgilityPic id="lcp" image={hero} priority widths={[480, 960, 1920, 3840]} sizes="100vw" fallbackWidth={960} />
			<AgilityPic
				id="legacy"
				image={card}
				fallbackWidth={400}
				sources={[
					{ media: "(min-width: 640px)", width: 640 },
					{ media: "(max-width: 639px)", width: 400 },
				]}
			/>
			<NextImage id="nextimage" src={card.url} alt="Card" width={400} height={300} />
			<ContentZone name="main" page={page} sitemapNode={{}} languageCode="en-us" channelName="website" getModule={getModule} isDevelopmentMode={false} isPreview={false} />
		</main>
	)
}
