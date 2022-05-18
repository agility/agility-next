import React, { FC } from 'react';
import Image, { ImageProps } from "next/image";

export const AgilityImage: FC<ImageProps> = (props) => {

	let loader = null

	if (!props.loader) {
		loader = ({ src, width,height, quality }) => {
			const w = width > 0 ? `&w=${width}` : ``
			const h = height > 0 ? `&h=${height}` : ``
			const format = ['.svg', '.png'].some((i) => src.toLowerCase().indexOf(i) > -1) ? '' : "&format=auto";
			return `${src}?q=${quality || 75}${w}${h}${format}`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}