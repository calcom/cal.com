import { ComponentProps } from "react";
import * as ReactDOMServer from "react-dom/server";

import * as templates from "./templates";

function renderEmail<K extends keyof typeof templates>(
  template: K,
  props: ComponentProps<typeof templates[K]>
) {
  const Component = templates[template];
  return (
    ReactDOMServer.renderToStaticMarkup(Component(props))
      // Remove `<RawHtml />` injected scripts
      .replace(/<script><\/script>/g, "")
      .replace(
        "<html>",
        `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
      )
  );
}

export default renderEmail;
