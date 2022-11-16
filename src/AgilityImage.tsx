import React, {FC} from "react"
import Image, {ImageLoader, ImageProps} from "next/image"

export const AgilityImage: FC<ImageProps> = (props) => {
	let loader: ImageLoader = null

	if (!props.loader) {
		loader = ({ src, width, quality }) => {
			let theWidth: number = width

			//if the width that was asked for is greater than the image width, max out at the image width
			if (props.width > 0 && width > props.width) theWidth = Number(props.width)
			const w = theWidth > 0 ? `&w=${theWidth}` : ``
			const format = src.toLowerCase().indexOf(".svg") === -1 ? "&format=auto" : ""
			return `${src}?q=${quality || 60}${w}${format}`
		}
	} else {
		loader = props.loader
	}

	return <Image {...props} loader={loader} />
}
