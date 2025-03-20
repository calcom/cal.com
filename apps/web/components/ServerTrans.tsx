// Partially copied from https://github.com/i18next/react-i18next/blob/master/src/TransWithoutContext.js
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import HTML from "html-parse-stringify";
import type { TFunction } from "i18next";
import type { ReactNode, ReactElement, FC } from "react";
import React, { isValidElement, Fragment, createElement, cloneElement, Children } from "react";

type CustomTransProps = {
  i18nKey: string; // Translation key
  components?: ReactElement[] | Record<string, ReactElement>; // Components to inject
  t: TFunction;
  values?: Record<string, string | number>; // Values for interpolation
  count?: number; // Count for pluralization
  children?: ReactNode; // Children as fallback content
  parent?: React.ElementType; // Parent element to wrap content in
};

// Utility functions adapted from react-i18next
const getAsArray = (data: any) => (Array.isArray(data) ? data : [data]);
const isObject = (obj: any) => obj && typeof obj === "object" && !Array.isArray(obj);
const hasChildren = (node: any) => {
  if (!node) return false;
  return !!(node.props?.children ?? node.children);
};
const getChildren = (node: any) => {
  if (!node) return [];
  return node.props?.children ?? node.children;
};
const mergeProps = (source: any, target: any) => {
  const newTarget = { ...target };
  newTarget.props = Object.assign(source.props || {}, target.props || {});
  return newTarget;
};

/**
 * A custom Trans component that doesn't use React Context
 * Supports HTML tags in translations
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
  // Prepare translation options
  const translationOptions = { ...values };
  if (count !== undefined) {
    translationOptions.count = count;
  }

  // Get translated content
  const content = t(i18nKey, translationOptions);

  // If no translated content is available, use the children as fallback
  if (!content && children) {
    return <>{children}</>;
  }

  // If there are no components and no HTML tags, just return the content
  if (
    (!components ||
      (Array.isArray(components) && components.length === 0) ||
      (isObject(components) && Object.keys(components).length === 0)) &&
    !/<[a-z][\s\S]*>/i.test(content)
  ) {
    return <>{content}</>;
  }

  // Prepare components for rendering
  const processedComponents = processComponents(components, content);

  // Render the content with components
  const renderedContent = renderNodes(processedComponents || children, content, translationOptions);

  // Return with parent if specified
  return parent ? createElement(parent, {}, renderedContent) : <>{renderedContent}</>;
};

// Process components similar to react-i18next
const processComponents = (components: any, translation: string) => {
  if (!components) return null;

  const fixComponentProps = (component: ReactElement, index: number | string) => {
    const componentKey = component.key || index;
    const comp = cloneElement(component, { key: componentKey });

    // Handle void components
    if (
      !comp.props ||
      !comp.props.children ||
      (String(translation).indexOf(`${index}/>`) < 0 && String(translation).indexOf(`${index} />`) < 0)
    ) {
      return comp;
    }

    function Componentized() {
      return createElement(Fragment, null, comp);
    }
    return createElement(Componentized, { key: componentKey });
  };

  // Handle array components
  if (Array.isArray(components)) {
    return components.map((c, index) => fixComponentProps(c, index));
  }

  // Handle object components
  if (isObject(components)) {
    const componentMap: Record<string, ReactElement> = {};
    Object.keys(components).forEach((c) => {
      componentMap[c] = fixComponentProps(components[c], c);
    });
    return componentMap;
  }

  return null;
};

// Render nodes from translation string and components
const renderNodes = (reactNode: any, targetString: string, interpolationOpts: any) => {
  if (targetString === "") return [];

  // If no HTML and no components, return as is
  if (!/<[a-z][\s\S]*>/i.test(targetString) && !reactNode) return [targetString];

  // Parse HTML string to AST
  const ast = HTML.parse(`<0>${targetString}</0>`);

  // Map AST to React elements
  const mapAST = (reactNodes: any, astNodes: any, rootReactNode: any) => {
    const reactNodesArray = getAsArray(reactNodes);
    const astNodesArray = getAsArray(astNodes);

    return astNodesArray.reduce((mem: any[], node: any, i: number) => {
      // Handle text nodes
      if (node.type === "text") {
        mem.push(node.content);
        return mem;
      }

      // Handle HTML tags
      if (node.type === "tag") {
        // Try to find matching component
        let component = reactNodesArray[parseInt(node.name, 10)];

        // Check if it's an object component
        if (rootReactNode.length === 1 && !component) {
          component = rootReactNode[0][node.name];
        }

        // Default to empty object if no component found
        if (!component) component = {};

        // Merge attributes if any
        const child =
          Object.keys(node.attrs).length !== 0 ? mergeProps({ props: node.attrs }, component) : component;

        // If it's a valid React element
        if (isValidElement(child)) {
          // If it has children or the node has children
          if (hasChildren(child) || (node.children && node.children.length > 0 && !node.voidElement)) {
            const innerChildren = hasChildren(child) ? getChildren(child) : reactNodesArray;

            const mappedChildren = mapAST(innerChildren, node.children, rootReactNode);

            mem.push(cloneElement(child, { key: i }, mappedChildren));
          } else {
            // No children case
            mem.push(cloneElement(child, { key: i }));
          }
        }
        // Handle HTML tag that's not a component
        else if (isNaN(parseFloat(node.name))) {
          // It's an HTML element like <strong>, <span>, etc.
          if (node.voidElement) {
            // Void elements like <br/>, <img/>
            mem.push(createElement(node.name, { key: `${node.name}-${i}` }));
          } else {
            // Regular elements with children
            const inner = mapAST(reactNodesArray, node.children, rootReactNode);
            mem.push(createElement(node.name, { key: `${node.name}-${i}` }, inner));
          }
        }
        // Handle component by index
        else {
          const inner = mapAST(reactNodesArray, node.children, rootReactNode);
          mem.push(<Fragment key={i}>{inner}</Fragment>);
        }
      }

      return mem;
    }, []);
  };

  // Call mapAST with properly structured input
  const result = mapAST([{ dummy: true, children: reactNode || [] }], ast, getAsArray(reactNode || []));

  return getChildren(result[0]);
};

export default ServerTrans;
