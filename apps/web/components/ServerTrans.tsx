// Partially copied from https://github.com/i18next/react-i18next/blob/master/src/TransWithoutContext.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import HTML from "html-parse-stringify";
import type { TFunction } from "i18next";
import type { ReactNode, ReactElement, FC } from "react";
import React, { isValidElement } from "react";

type CustomTransProps = {
  i18nKey: string; // Translation key
  components?: ReactElement[] | Record<string, ReactElement>; // Components to inject
  t: TFunction;
  values?: Record<string, string | number>; // Values for interpolation
  count?: number; // Count for pluralization
  children?: ReactNode; // Children as fallback content
  parent?: React.ElementType; // Parent element to wrap content in
};

/**
 * A custom Trans component that doesn't use React Context
 * Supports HTML tags in translations and preserves component styling and interactivity
 */
const ServerTrans: FC<CustomTransProps> = ({
  i18nKey,
  components = [],
  t,
  values = {},
  count,
  children,
  parent,
}) => {
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

  // If no content or components, just return the content
  if (
    !content ||
    !components ||
    (Array.isArray(components) && components.length === 0) ||
    (!Array.isArray(components) && Object.keys(components).length === 0)
  ) {
    return <>{content}</>;
  }

  // Process different kinds of tags
  let processedContent = content;

  // 1. First try to render with components
  let rendered = processHtmlAndComponents(processedContent, components);

  // 2. If children are provided, try to use them as fallback
  if ((!Array.isArray(rendered) || rendered.length === 0) && children) {
    return <>{children}</>;
  }

  // Return with parent if specified
  if (parent) {
    const Parent = parent;
    return <Parent>{rendered}</Parent>;
  }

  return <>{rendered}</>;
};

// Unified function to process both HTML tags and components in translation
const processHtmlAndComponents = (
  text: string,
  components: ReactElement[] | Record<string, ReactElement>
) => {
  // First, extract and replace HTML tags and components to avoid conflicts
  const placeholders: { [key: string]: ReactNode } = {};
  let processedText = text;

  // Process array-based components (indexed like <0>text</0>)
  if (Array.isArray(components)) {
    components.forEach((component, index) => {
      if (!isValidElement(component)) return;

      const tagPattern = new RegExp(`<${index}>(.*?)<\/${index}>`, "gs");
      processedText = processedText.replace(tagPattern, (match, innerContent) => {
        const placeholder = `__COMPONENT_ARRAY_${index}_${Math.random().toString(36).substring(2)}__`;
        placeholders[placeholder] = React.cloneElement(
          component,
          {
            ...(component.props || {}),
            key: component.key || `comp-${index}`,
          },
          innerContent
        );
        return placeholder;
      });
    });
  }

  // Process object-based components (named like <tag>text</tag> where tag is a key in components object)
  if (!Array.isArray(components) && typeof components === "object") {
    Object.entries(components).forEach(([tag, component]) => {
      if (!isValidElement(component)) return;

      // Match both <tag>content</tag> format
      const tagPattern = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "gs");
      processedText = processedText.replace(tagPattern, (match, innerContent) => {
        const placeholder = `__COMPONENT_OBJECT_${tag}_${Math.random().toString(36).substring(2)}__`;
        placeholders[placeholder] = React.cloneElement(
          component,
          {
            ...(component.props || {}),
            key: component.key || `comp-${tag}`,
          },
          innerContent
        );
        return placeholder;
      });

      // Also match self-closing tags like <tag/>
      const selfClosingPattern = new RegExp(`<${tag}\\s*\\/>`, "g");
      processedText = processedText.replace(selfClosingPattern, () => {
        const placeholder = `__COMPONENT_OBJECT_SELF_${tag}_${Math.random().toString(36).substring(2)}__`;
        placeholders[placeholder] = React.cloneElement(component, {
          ...(component.props || {}),
          key: component.key || `comp-self-${tag}`,
        });
        return placeholder;
      });

      // Match {{ key }} format for interpolation
      const interpolationPattern = new RegExp(`{{\\s*${tag}\\s*}}`, "g");
      processedText = processedText.replace(interpolationPattern, () => {
        const placeholder = `__COMPONENT_INTERPOLATION_${tag}_${Math.random().toString(36).substring(2)}__`;
        placeholders[placeholder] = React.cloneElement(component, {
          ...(component.props || {}),
          key: component.key || `interp-${tag}`,
        });
        return placeholder;
      });
    });
  }

  // Process common HTML tags that might be directly in the translation
  processedText = processHtmlTags(processedText);

  // Now reassemble the final content by replacing placeholders with their components
  const result: ReactNode[] = [];
  let currentText = "";

  for (let i = 0; i < processedText.length; i++) {
    let foundPlaceholder = false;

    // Check if current position starts a placeholder
    for (const [placeholder, component] of Object.entries(placeholders)) {
      if (processedText.substring(i, i + placeholder.length) === placeholder) {
        if (currentText) {
          result.push(currentText);
          currentText = "";
        }
        result.push(component);
        i += placeholder.length - 1;
        foundPlaceholder = true;
        break;
      }
    }

    if (!foundPlaceholder) {
      currentText += processedText[i];
    }
  }

  if (currentText) {
    result.push(currentText);
  }

  return result.length > 0 ? result : processedText;
};

// Process HTML tags that might be in the translation string
const processHtmlTags = (text: string) => {
  let processedText = text;

  // Process common HTML tags
  const htmlTags = [
    { tag: "strong", component: "strong" },
    { tag: "b", component: "b" },
    { tag: "i", component: "i" },
    { tag: "em", component: "em" },
    { tag: "p", component: "p" },
    { tag: "br", component: "br", selfClosing: true },
    { tag: "div", component: "div" },
    { tag: "span", component: "span" },
    { tag: "a", component: "a", hasAttributes: true },
    { tag: "ul", component: "ul" },
    { tag: "ol", component: "ol" },
    { tag: "li", component: "li" },
  ];

  htmlTags.forEach(({ tag, component, selfClosing, hasAttributes }) => {
    if (selfClosing) {
      // Handle self-closing tags like <br/>
      const selfClosingRegex = new RegExp(`<${tag}\\s*\\/>`, "g");
      processedText = processedText.replace(selfClosingRegex, `<__HTML_SELF_${component}__/>`);
    } else if (hasAttributes) {
      // Handle tags with attributes like <a href="...">text</a>
      const tagWithAttributesRegex = new RegExp(`<${tag}\\s+([^>]*)>(.*?)<\\/${tag}>`, "gs");
      processedText = processedText.replace(
        tagWithAttributesRegex,
        `<__HTML_ATTR_${component}__$1>$2</__HTML_ATTR_${component}__>`
      );
    } else {
      // Handle regular tags like <strong>text</strong>
      const tagRegex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "gs");
      processedText = processedText.replace(tagRegex, `<__HTML_${component}__>$1</__HTML_${component}__>`);
    }
  });

  return processedText;
};

export default ServerTrans;
