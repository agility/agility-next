import { FC, ClassicComponent } from 'react'
import type { GetStaticPropsContext } from 'next'
import { ParsedUrlQuery } from 'querystring'



/**
 * Extension of the GetStaticPropsContext type for Agility CMS.
 * Adds the globalComponents array and getter methods for modules and page templates.
 *
 * @export
 * @interface AgilityGetStaticPropsContext
 * @extends {GetStaticPropsContext<Q>}
 * @template Q
 */
export interface AgilityGetStaticPropsContext<Q extends ParsedUrlQuery = ParsedUrlQuery> extends GetStaticPropsContext<Q> {

	/**
	 * A dictionary of the global components (such as header/footer) that have a getCustomInitialProps method.
	 * Adding a component to this will add results of that method call to the globalData dictionary available in the page props.
	 *
	 * @type {([FC | ClassicComponent])}
	 * @memberof AgilityGetStaticPropsContext
	 */
	globalComponents?: { [ name: string ] : FC | ClassicComponent  }

	/**
	 * A function that will return the component for a given module.
	 * If the component has a getCustomInitialProps method,
	 * that method will be called the result added to the customData dictionary available in the module props.
	 *
	 * @param {string} moduleName
	 * @returns {(FC | ClassicComponent)}
	 * @memberof AgilityGetStaticPropsContext
	 */
	getModule(moduleName:string): FC | ClassicComponent

}

export interface AgilityPageProps  {
	sitemapNode?: any,
	page?: any,
	dynamicPageItem?: any,
	pageTemplateName?:string|null,
	globalData?:{ [ name: string ] : any  }
	languageCode?:string|null,
	channelName?:string|null,
	isPreview?:boolean,
	isDevelopmentMode?:boolean,
	notFound?:boolean
}

export interface CustomInitPropsArg {
	item: any
	page:any
	agility: any
	languageCode: any
	channelName: any
	pageInSitemap: any
	dynamicPageItem?: any
}

export interface ModuleProps<T> {
	page:any
	module: ContentItem<T>
	languageCode: string
	channelName: string
	pageInSitemap: any
	dynamicPageItem?: ContentItem<any>
}

export interface DynamicModuleProps<T, D> {
	page:any
	module: ContentItem<T>
	languageCode: string
	channelName: string
	pageInSitemap: any
	dynamicPageItem?: ContentItem<D>
}

export interface CustomInitProps<T, C>
	extends ModuleProps<T>
{
	customData: C
}


export interface Module<TContent> extends FC<ModuleProps<TContent>> {

}

export interface ModuleWithDynamic<TContent, TDynamicPageItem> extends FC<DynamicModuleProps<TContent, TDynamicPageItem>> {

}

export interface ModuleWithInit<TProps, TInit> extends FC<CustomInitProps<TProps, TInit>> {
	getCustomInitialProps?(props:CustomInitPropsArg): Promise<TInit>
}

export interface Properties {
	state: number,
	modified: string,
	versionID: number,
	referenceName: string,
	definitionName: string,
	itemOrder: number
}

export interface ContentItem<T> {
	contentID: number
	properties: Properties
	fields:T
}

export interface ImageField {
	label: string
	url: string
	target: string
	filesize: Number
	height: Number
	width: Number
}

export interface URLField {
	href: string
	target: string
	text: string
}