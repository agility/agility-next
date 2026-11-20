import React, {FC} from "react"
import * as ReactDOM from "react-dom"
import {ImageField} from "./types"

interface AgilityImageSourceProps
	extends Omit<React.DetailedHTMLProps<React.SourceHTMLAttributes<HTMLSourceElement>, HTMLSourceElement>, "srcSet"> {}

/**
 * The image AgilityPic renders. An `ImageField` from Agility fits it; only `url` is required.
 * `width` and `height` are the original's pixel size: they cap every generated width (the Agility
 * image API upscales when asked for a width larger than the original) and give the `<img>` its
 * `width` and `height` attributes.
 */
export interface AgilityPicImage extends Partial<Omit<ImageField, "label">> {
	url: string
	label?: string | null
}

/**
 * Standard `<img>` attributes passed through to the rendered `<img>`.
 * `src` and `srcSet` are built by AgilityPic, so they can't be passed.
 */
type AgilityPicImgAttributes = Omit<
	React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
	"src" | "srcSet" | "alt" | "className" | "ref"
>

/**
 * The AgilityPic component allows you to specify different image sizes for different css media selectors.
 * @exports
 * @interface AgilityPicProps
 */
export interface AgilityPicProps extends AgilityPicImgAttributes {
	/**
	 * An image from Agility.
	 */
	image: AgilityPicImage | ImageField
	/**
	 * optional: the fallback width of the image to output in the <img> tag after the sources.
	 * This will render if no sources are selected, or if the browser does not support the <picture> tag.
	 * It is capped at the original's width.
	 */
	fallbackWidth?: number

	/**
	 * optional: the alt text for the image if you don't want to use the one defined on the image from Agility.
	 * Pass `alt=""` for a decorative image.
	 */
	alt?: string

	/**
	 * optional: the sources for the image.  This allows you to specify different image sizes for different css media selectors.
	 */
	sources?: AgilityImageSourceProps[]

	/**
	 * optional: the widths to offer the browser in a width-descriptor `srcset` on the <img> (`?w=640 640w, ...`).
	 * Use it with `sizes`. Widths larger than the original are dropped and replaced by the original's width.
	 * When `sizes` is set and `widths` isn't, a default set of widths is used.
	 */
	widths?: number[]

	/**
	 * optional: the `sizes` attribute for the <img>: how wide the image is drawn at each viewport size,
	 * for example `"(min-width: 1024px) 50vw, 100vw"`. Setting it (or `widths`) gives the <img> a
	 * width-descriptor `srcset`, so the browser picks the file that fits the layout and the screen density.
	 * With `widths` and no `sizes`, `sizes` is `"100vw"`.
	 */
	sizes?: string

	/**
	 * optional: the image quality (1-100) passed to the Agility image API as `q`. Unset, the API's default is used.
	 */
	quality?: number

	/**
	 * optional: true when this is the most important image on the page (the LCP image).
	 * The <img> is loaded eagerly with `fetchpriority="high"`, and a `<link rel="preload">` is emitted
	 * for it when that preload can match the image the browser will pick (see `preload`).
	 */
	priority?: boolean

	/**
	 * optional: whether a `priority` image gets a `<link rel="preload" as="image">` (React 19's `preload()`).
	 * Defaults to true for a `priority` image. The preload is only emitted when there are no `sources`:
	 * a preload can't say "use this file only when no earlier <source> matched", so with media sources it
	 * could fetch a file the browser then doesn't use. For an LCP image, prefer `widths` + `sizes` over `sources`.
	 */
	preload?: boolean

	/**
	 * optional: set the <img>'s `width` and `height` attributes from the image's dimensions, so the browser
	 * reserves the space before the file arrives (no layout shift). The width is the fallback width (or the
	 * original's width), and the height keeps the original's aspect ratio. <source> elements get the matching
	 * dimension too.
	 * Defaults to true when `sizes` or `widths` is set, and to false otherwise, so pages built before 16.2 render
	 * exactly as they did. Check that your CSS doesn't set an image's width without `height: auto` before
	 * turning it on, or the image is stretched to the `height` attribute.
	 * Passing `width` and `height` yourself overrides them.
	 */
	intrinsicSize?: boolean

	/**
	 * The class name to apply to the <img>. You do NOT have to apply classNames to the source tags, as they inherit the class from the img.
	 */
	className?: string
}

/** The widths offered when `sizes` is set without `widths`. */
export const AGILITY_PIC_DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600, 1920, 2560]

/**
 * File types the Agility image API doesn't transform. SVG: `format=auto` would rasterize it.
 * JFIF and JPE: any image query returns a 404, while the bare URL works.
 */
const UNTRANSFORMABLE = /\.(svg|jfif|jpe)$/i

const pathnameOf = (url: string) => {
	try {
		return new URL(url, "https://example.com").pathname
	} catch (e) {
		return url.split(/[?#]/)[0]
	}
}

const isTransformable = (url: string) => !UNTRANSFORMABLE.test(pathnameOf(url))

/**
 * The URL with image API parameters added: after its own query string if it has one,
 * and before a `#fragment` (which the browser never sends).
 */
const withParams = (url: string, params: string) => {
	const hash = url.indexOf("#")
	const base = hash === -1 ? url : url.slice(0, hash)
	const fragment = hash === -1 ? "" : url.slice(hash)
	return `${base}${base.indexOf("?") === -1 ? "?" : "&"}${params}${fragment}`
}

/**
 * A URL as one `srcset` candidate. srcset splits candidates on whitespace and commas,
 * so a file name with a space or a comma has to have them encoded there.
 */
const srcSetUrl = (url: string) => url.replace(/ /g, "%20").replace(/,/g, "%2C")

/**
 * React 19 knows the `fetchPriority` prop. React 18 (which Next 16's Pages Router can run on) doesn't:
 * it warns about the camelCase name, so there the attribute is passed in lower case, as HTML spells it.
 */
const fetchPriorityProp = (value: string | undefined): {[key: string]: string | undefined} => {
	if (!value) return {}
	const major = parseInt(String(React.version || "19").split(".")[0], 10)
	return major >= 19 ? {fetchPriority: value} : {fetchpriority: value}
}

const positive = (n: unknown): number => {
	const v = Number(n)
	return v > 0 && isFinite(v) ? v : 0
}

/**
 * This will output a picture tag with the image and sources provided, using the Agility Image API.
 * The sources property allows you to specify different image sizes for different css media selectors.
 * The widths and sizes properties give the <img> a width-descriptor srcset, so the browser picks the size.
 *
 * @param {AgilityPicProps} props
 */
export const AgilityPic: FC<AgilityPicProps> = ({
	image,
	alt,
	priority,
	className,
	sources,
	fallbackWidth,
	widths,
	sizes,
	quality,
	preload,
	intrinsicSize,
	//fetchPriority is taken out of the <img> props: it is written by fetchPriorityProp, which uses the
	//lower-case attribute on React 18 (a camelCase key there, even set to undefined, makes React warn)
	fetchPriority: fetchPriorityAttr,
	...imgProps
}) => {
	//don't blow up if we weren't given an image to render
	if (!image || !image.url) return null

	const url = image.url
	const transformable = isTransformable(url)
	const imageWidth = positive(image.width)
	const imageHeight = positive(image.height)
	const q = positive(quality) > 0 ? `&q=${Math.min(100, Math.round(positive(quality)))}` : ``
	//`quality` alone (no width) sends the original through the image API; not for GIFs,
	//which the API may return as a single still frame in a modern format
	const qualityOnly = transformable && !!q && !/\.gif$/i.test(pathnameOf(url))

	//never ask the image API for more than the original's width: it upscales
	const capWidth = (w: number) => (imageWidth > 0 ? Math.min(w, imageWidth) : w)
	const sizedUrl = (w: number, h?: number) =>
		withParams(url, `format=auto${w > 0 ? `&w=${w}` : ``}${h > 0 ? `&h=${h}` : ``}${q}`)

	//the fallback <img> src: the bare URL unless a width or a quality is asked for
	let src = url
	const srcWidth = transformable ? capWidth(positive(fallbackWidth)) : 0
	if (srcWidth > 0) src = sizedUrl(srcWidth)
	else if (qualityOnly) src = sizedUrl(0)

	//width-descriptor srcset mode: widths and/or sizes
	let imgSrcSet: string | undefined = undefined
	let imgSizes: string | undefined = sizes
	if (transformable && ((widths && widths.length > 0) || sizes)) {
		const requested = widths && widths.length > 0 ? widths : AGILITY_PIC_DEFAULT_WIDTHS
		//with no original width known, cap at twice the fallback width (the ceiling a 2x screen needs)
		const cap = imageWidth > 0 ? imageWidth : positive(fallbackWidth) * 2
		const list: number[] = []
		for (let i = 0; i < requested.length; i++) {
			let w = Math.round(positive(requested[i]))
			if (w <= 0) continue
			if (cap > 0 && w > cap) w = cap
			if (list.indexOf(w) === -1) list.push(w)
		}
		list.sort((a, b) => a - b)
		if (list.length > 0) {
			imgSrcSet = list
				.map((w) => `${srcSetUrl(sizedUrl(w))} ${w}w`)
				.join(", ")
			if (!imgSizes) imgSizes = "100vw"
			//with no fallback width, the src is the largest candidate (only browsers without srcset use it)
			if (!(srcWidth > 0)) src = sizedUrl(list[list.length - 1])
		}
	}

	//width and height attributes: on by default in the srcset mode only, so pre-16.2 usage renders the same
	const intrinsic = intrinsicSize ?? !!imgSrcSet
	//width and height attributes: the rendered file's width, at the original's aspect ratio
	let width: number | undefined = undefined
	let height: number | undefined = undefined
	if (intrinsic && imageWidth > 0 && imageHeight > 0) {
		width = srcWidth > 0 ? srcWidth : imageWidth
		height = Math.round((width * imageHeight) / imageWidth)
	}

	const sourceElements =
		transformable && sources
			? sources.map((source, index) => {
					//a source with no size serves the original, at the requested quality if there is one
					let srcSet = srcSetUrl(qualityOnly ? sizedUrl(0) : url)
					const sw = positive(source.width)
					const sh = positive(source.height)
					const key = `${url}-${index}`
					let w = sw
					let h = sh

					if (sw > 0 || sh > 0) {
						//if we have a width and NOT a height, do NOT allow the image to be sized larger than the original width
						if (sw > 0 && !(sh > 0)) w = capWidth(sw)

						//if we have a height and NOT a width, do NOT allow the image to be sized larger than the original height
						if (sh > 0 && !(sw > 0) && imageHeight > 0) h = Math.min(sh, imageHeight)

						srcSet = srcSetUrl(sizedUrl(w, h))
					}

					//a width-only (or height-only) source gets the other dimension at the original's aspect ratio,
					//so the browser can reserve the space when this source is picked
					const dims: {width?: number; height?: number} = {}
					if (intrinsic && imageWidth > 0 && imageHeight > 0) {
						if (sw > 0 && !(sh > 0)) dims.height = Math.round((sw * imageHeight) / imageWidth)
						if (sh > 0 && !(sw > 0)) dims.width = Math.round((sh * imageWidth) / imageHeight)
						//a source with no size serves the original
						if (!(sw > 0) && !(sh > 0)) {
							dims.width = imageWidth
							dims.height = imageHeight
						}
					}

					return <source key={key} {...source} {...dims} srcSet={srcSet} />
			  })
			: null

	//a preload has to match what the browser will pick.
	//ReactDOM.preload exists from React 19; on React 18 there is no preload, only the <img> hints, which it can't with <source> elements in front of the <img>
	const hasSources = !!sourceElements && sourceElements.length > 0
	//an empty fetchPriority counts as unset, so the <img> and its preload agree
	const fetchPriority = fetchPriorityAttr || (priority ? "high" : undefined)
	if (priority && preload !== false && !hasSources && typeof ReactDOM.preload === "function") {
		ReactDOM.preload(src, {
			as: "image",
			fetchPriority: fetchPriority === "low" || fetchPriority === "auto" ? fetchPriority : "high",
			imageSrcSet: imgSrcSet,
			imageSizes: imgSrcSet ? imgSizes : undefined,
			crossOrigin: imgProps.crossOrigin as "anonymous" | "use-credentials" | "" | undefined,
			referrerPolicy: imgProps.referrerPolicy,
		})
	}

	return (
		<picture>
			{sourceElements}

			<img
				loading={priority ? "eager" : "lazy"}
				width={width}
				height={height}
				{...imgProps}
				{...fetchPriorityProp(fetchPriority)}
				src={src}
				srcSet={imgSrcSet}
				sizes={imgSrcSet ? imgSizes : undefined}
				alt={alt ?? image.label ?? ""}
				className={className}
			/>
		</picture>
	)
}
