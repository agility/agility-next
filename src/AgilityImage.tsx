import React, { FC } from 'react';
import Image, { ImageProps } from "next/image";

export const AgilityImage: FC<ImageProps> = (props) => {

	let loader = null

	if (!props.loader) {
		loader = ({ src, width,height, quality }) => {
			const w = width > 0 ? `&w=${width}` : ``
			const h = height > 0 ? `&h=${height}` : ``
			return `${src}?q=${quality || 75}${w}${h}`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}