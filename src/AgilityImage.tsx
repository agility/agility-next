import React, { FC } from 'react';
import Image, { ImageProps } from "next/image";

export const AgilityImage: FC<ImageProps> = (props) => {

	let loader = null

	if (!props.loader) {
		loader = ({ src, width, quality }) => {
			return `${src}?width=${width}q=${quality || 75}`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}