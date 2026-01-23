import { render } from "@react-email/render";

import * as templates from "./templates";

async function renderEmail<K extends keyof typeof templates>(
  template: K,
  props: React.ComponentProps<(typeof templates)[K]>
) {
  const Component = templates[template];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - Component props are dynamically typed based on template
  const html = await render(Component(props));
  return (
    html
      // Remove `<RawHtml />` injected scripts (legacy compatibility)
      .replace(/<script><\/script>/g, "")
      .replace(
        "<html>",
        `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
      )
  );
}

export default renderEmail;
