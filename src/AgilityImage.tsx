"use client"
import React, {FC} from "react"
import Image, {ImageLoader, ImageProps} from "next/image"

/**
 * A wrapper around the next/image compontent that adds the Agility Image API to the loader.
 * If you are using the app router, this component MUST be used from a client component.
 * Consider using AgilityPic component instead - it give you more control over image output sizes.
 * @param {ImageProps} props
 */
export const AgilityImage: FC<ImageProps> = (props) => {
	let loader: ImageLoader = null

	if (!props.loader) {
		loader = ({src, width, quality}) => {
			let theWidth: number = width
			const propWidth = Number(props.width)
			//if the width that was asked for is greater than the image width, max out at the image width
			if (propWidth && width > propWidth) theWidth = propWidth
			const w = theWidth > 0 ? `&w=${theWidth}` : ``
			const format = src.toLowerCase().indexOf(".svg") === -1 ? "&format=auto" : ""
			if(src.toLowerCase().endsWith(".svg")) return src // don't format SVGs
			return `${src}?q=${quality || 60}${w}${format}`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}
