import type { TFunction } from "i18next";
import type { ReactNode, ReactElement, FC } from "react";
import React, { isValidElement, Fragment } from "react";

type CustomTransProps = {
  i18nKey: string; // Translation key
  components?: ReactElement[] | Record<string, ReactElement>; // Components to inject
  t: TFunction;
  values?: Record<string, string | number>; // Values for interpolation
  count?: number; // Count for pluralization
  children?: ReactNode; // Children as fallback content
};

/**
 * A custom Trans component that doesn't use React Context
 * Supports various Trans component use cases
 */
const CustomTrans: FC<CustomTransProps> = ({ i18nKey, components = [], t, values = {}, count, children }) => {
  // Get translated string with count if provided
  const translationOptions = { ...values };
  if (count !== undefined) {
    translationOptions.count = count;
  }

  const content = t(i18nKey, translationOptions);

  // If no translated content is available, use the children as fallback
  if (!content && children) {
    return <>{children}</>;
  }

  // If components is empty, just return the translated text
  if (!components || (Array.isArray(components) && components.length === 0)) {
    return <>{content}</>;
  }

  // Helper function to process a single component replacement
  const processComponentReplacement = (
    text: string,
    index: number | string,
    component: ReactElement
  ): ReactNode => {
    // For numeric indices, look for <0>text</0> pattern
    if (typeof index === "number") {
      const tagPattern = new RegExp(`<${index}>(.*?)<\\/${index}>`, "s");
      const match = text.match(tagPattern);

      if (match && match[1]) {
        const [beforeTag, ...rest] = text.split(`<${index}>`);
        const afterContent = rest.join(`<${index}>`).split(`</${index}>`);
        const innerContent = afterContent[0];
        const afterTag = afterContent.slice(1).join(`</${index}>`);

        return (
          <>
            {beforeTag}
            {React.cloneElement(component, { key: `trans-${index}` }, innerContent)}
            {afterTag}
          </>
        );
      }
    }
    // For string keys, look for {{key}} pattern
    else if (typeof index === "string") {
      const placeholder = `{{${index}}}`;
      if (text.includes(placeholder)) {
        const parts = text.split(placeholder);
        const result = [];

        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            result.push(React.cloneElement(component, { key: `trans-${index}-${i}` }));
          }
          if (parts[i]) {
            result.push(<Fragment key={`text-${index}-${i}`}>{parts[i]}</Fragment>);
          }
        }

        return <>{result}</>;
      }
    }

    return <>{text}</>;
  };

  // Process all components
  let result: ReactNode = content;

  if (Array.isArray(components)) {
    // Handle arrays - the typical <0>text</0> pattern
    components.forEach((component, index) => {
      if (isValidElement(component)) {
        result = processComponentReplacement(
          typeof result === "string" ? result : String(result),
          index,
          component
        );
      }
    });
  } else {
    // Handle objects - the named {{key}} pattern
    Object.entries(components).forEach(([key, component]) => {
      if (isValidElement(component)) {
        result = processComponentReplacement(
          typeof result === "string" ? result : String(result),
          key,
          component
        );
      }
    });
  }

  return <>{result}</>;
};

export default CustomTrans;
