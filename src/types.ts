import { FC, ClassicComponent } from "react";
import type { GetStaticPropsContext } from "next";
import { ParsedUrlQuery } from "querystring";
import { ContentItem, ApiClientInstance, Page } from "@agility/content-fetch";



/**
 * The GetDynamicPageItem function is used to retrieve the dynamic page item for a given page.
 * 
 * @export
 * @interface getDynamicPageURL
 * @param {int} contentID The contentID of the dynamic page item
 * @param {boolean} preview Whether to use the preview API key
 * @param {string | null} slug The slug of the dynamic page item, optional
 * @param {string | null} locale The locale of the dynamic page item, optional
 * 
 */
export interface IGetDynamicPageURLProps {
  contentID: number;
  preview: boolean;
  slug?: string | null;
  locale?: string | null;
}


/**
 * Extension of the GetStaticPropsContext type for Agility CMS.
 * Adds the globalComponents array and getter methods for modules and page templates.
 *
 * @export
 * @interface AgilityGetStaticPropsContext
 * @extends {GetStaticPropsContext<Q>}
 * @template Q
 */
export interface AgilityGetStaticPropsContext<
  Q extends ParsedUrlQuery = ParsedUrlQuery
> extends GetStaticPropsContext<Q> {
  /**
   * A dictionary of the global components (such as header/footer) that have a getCustomInitialProps method.
   * Adding a component to this will add results of that method call to the globalData dictionary available in the page props
   *
   * @type {{ [ name: string ] : ComponentWithInit  }}
   * @memberof AgilityGetStaticPropsContext
   */
  globalComponents?: { [name: string]: ComponentWithInit };

  /**
   * A function that will return the component for a given module.
   * If the component has a getCustomInitialProps method,
   * that method will be called the result added to the customData dictionary available in the module props.
   * This is OPTIONAL since we don't need it with app router implementations.
   *
   * @param {string} moduleName
   * @returns {(FC | ClassicComponent)}
   * @memberof AgilityGetStaticPropsContext
   */
  getModule?: (moduleName: string) => ModuleWithInit | null;
  apiOptions?: ApiOptions;
}

export interface AgilitySitemapNode {
  title: string
  name: string
  pageID: number
  menuText: number
  visible: { menu?: boolean, sitemap?: boolean },
  path: string
  redirect: string | null
  isFolder: false,
  contentID?: number
}

export interface AgilityPageProps {
  sitemapNode: AgilitySitemapNode;
  page?: Page;
  dynamicPageItem?: any;
  pageTemplateName?: string | null;
  languageCode?: string | null;
  channelName?: string | null;
  isPreview?: boolean;
  isDevelopmentMode?: boolean;
  notFound?: boolean;
  getModule?(moduleName: string): ModuleWithInit | null;
  globalData?: { [name: string]: any };
}

export interface CustomInitPropsArg {
  item: any;
  page: Page;
  agility: ApiClientInstance;
  languageCode: string;
  channelName: string;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: any;
}

export interface GlobalCustomInitPropsArg {
  page: Page;
  agility: ApiClientInstance;
  languageCode: string;
  channelName: string;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: any;
}

export interface ModuleProps<T> {
  page: Page;
  module: ContentItem<T>;
  languageCode: string;
  channelName: string;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: ContentItem<any>;
  isDevelopmentMode: boolean;
  isPreview: boolean;
  globalData?: { [name: string]: any };
}

export interface UnloadedModuleProps {
  page: Page;
  module: { contentid: number };
  languageCode: string;
  channelName: string;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: ContentItem<any>;
  isDevelopmentMode: boolean;
  isPreview: boolean;
  globalData?: { [name: string]: any };
}

export interface DynamicModuleProps<T, D> {
  page: Page;
  module: ContentItem<T>;
  languageCode: string;
  channelName: string;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: ContentItem<D>;
  globalData?: { [name: string]: any };
}

export interface CustomInitProps<T, C> extends ModuleProps<T> {
  customData: C;
}



export interface UnloadedModule extends FC<UnloadedModuleProps> { }

export interface Module<TContent> extends FC<ModuleProps<TContent>> { }

export interface ModuleWithDynamic<TContent, TDynamicPageItem>
  extends FC<DynamicModuleProps<TContent, TDynamicPageItem>> { }



/**
 * A component used to render an Agility module that has an additional data access method called getCustomInitialProps
 *
 * @export
 * @interface ModuleWithInit
 * @extends {FC<CustomInitProps<TProps, TInit>>}
 * @template TProps The type of props object that the component expects
 * @template TInit The type of object that will be returned by the getCustomInitialProps method
 */
export interface ModuleWithInit<TProps = {}, TInit = {}>
  extends FC<CustomInitProps<TProps, TInit>> {
  getCustomInitialProps?(props: CustomInitPropsArg): Promise<TInit>;
}

/**
 * A component with an additional data access method called getCustomInitialProps
 *
 * @export
 * @interface ComponentWithInit
 * @extends {FC<TProps>}
 * @template TProps The type of props object that the component expects
 * @template TInit The type of object that will be returned by the getCustomInitialProps method
 */
export interface ComponentWithInit<TInit = {}> extends FC<AgilityPageProps> {
  getCustomInitialProps?(props: GlobalCustomInitPropsArg): Promise<TInit>;
}

export interface ContentZoneProps {
  name: string;
  page: Page;
  sitemapNode: AgilitySitemapNode;
  dynamicPageItem?: any;
  languageCode: string;
  channelName: string;
  getModule(moduleName: string): any;
  isDevelopmentMode: boolean;
  isPreview: boolean;
  globalData?: { [name: string]: any };
}

export interface Properties {
  state: number;
  modified: string;
  versionID: number;
  referenceName: string;
  definitionName: string;
  itemOrder: number;
}


export { ContentItem, ApiClientInstance }


export interface ImageField {
  label: string;
  url: string;
  target: string;
  filesize: number;
  height: number;
  width: number;
}

export interface URLField {
  href: string;
  target: string;
  text: string;
}

export interface ApiOptions {
  onSitemapRetrieved?: Function;
  expandAllContentLinks?: boolean;
  contentLinkDepth?: number;
}
