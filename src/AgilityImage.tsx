import React, { FC } from 'react';
import Image, { ImageProps } from "next/image";

export const AgilityImage: FC<ImageProps> = (props) => {

	if (!props.loader) {
		props.loader = ({ src, width, quality }) => {
			return `${src}?width=${width}q=${quality || 75}`
		}
	}

	return <Image {...props} />
}