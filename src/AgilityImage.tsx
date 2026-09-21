"use client"
import React, {FC} from "react"
import Image, {ImageLoader, ImageProps} from "next/image"
import {isSvgUrl} from "./isSvgUrl"

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
			//don't put SVGs through the image API - `format=auto` asks the CDN to rasterize them.
			//parsed rather than string-matched, so `logo.svg?v=2` is still caught
			if (isSvgUrl(src)) return src

			let theWidth: number = width
			const propWidth = Number(props.width)
			//if the width that was asked for is greater than the image width, max out at the image width
			if (propWidth && width > propWidth) theWidth = propWidth
			const w = theWidth > 0 ? `&w=${theWidth}` : ``
			return `${src}?q=${quality || 60}${w}&format=auto`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}
