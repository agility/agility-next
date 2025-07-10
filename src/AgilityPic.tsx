import React, { FC } from "react";
import { ImageField } from "./types";

interface AgilityImageSourceProps
  extends Omit<
    React.DetailedHTMLProps<
      React.SourceHTMLAttributes<HTMLSourceElement>,
      HTMLSourceElement
    >,
    "srcSet"
  > {}

/**
 * The AgilityPic component allows you to specify different image sizes for different css media selectors.
 * @exports
 * @interface AgilityImageProps
 */
export interface AgilityPicProps {
  /**
   * An image from Agility.
   */
  image: ImageField;
  /**
   * optional: the fallback width of the image to output in the <img> tag after the sources.
   * This will render if no sources are selected, or if the browser does not support the <picture> tag.
   */
  fallbackWidth?: number;

  /**
   * optional: the alt text for the image if you don't want to use the one defined on the image from Agility.
   */
  alt?: string;

  /**
   * optional: the sources for the image.  This allows you to specify different image sizes for different css media selectors.
   */
  sources?: AgilityImageSourceProps[];

  /**
   * optional: if true, the fallback  <img> as eager instead of lazy.
   */
  priority?: boolean;

  /**
   * The class name to apply to the <img>. You do NOT have to apply classNames to the source tags, as they inherit the class from the img.
   */
  className?: string;
}

/**
 * This will output a picture tag with the image and sources provided, using the Agility Image API.
 * The sources property allows you to specify different image sizes for different css media selectors.
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
}) => {
  // leave this alone – we always want sources to build off the original URL
  const baseUrl = image.url;

  return (
    <picture>
      {sources?.map((source, idx) => {
        let srcSet = baseUrl;
        const hasW = Number(source.width) > 0;
        const hasH = Number(source.height) > 0;
        let w = hasW ? `&w=${source.width}` : "";
        let h = hasH ? `&h=${source.height}` : "";

        if (hasW || hasH) {
          // clamp to original dims
          const sourceHeight = parseInt(`${source.height}`);
          const sourceWidth = parseInt(`${source.width}`);

          if (hasW && !hasH) h = `&h=${Math.min(sourceHeight, image.height)}`;
          if (hasH && !hasW) w = `&w=${Math.min(sourceWidth, image.width)}`;

          srcSet = `${baseUrl}?format=auto${w}${h}`;
        }

        return <source key={idx} {...source} srcSet={srcSet} />;
      })}

      <img
        loading={priority ? "eager" : "lazy"}
        src={
          // only bump to the fallback size if you have NO sources
          !sources?.length && fallbackWidth && fallbackWidth > 0
            ? `${baseUrl}?format=auto&w=${fallbackWidth}`
            : baseUrl
        }
        alt={alt ?? image.label}
        className={className}
      />
    </picture>
  );
};
