import * as templates from "./templates";

async function renderEmail<K extends keyof typeof templates>(
  template: K,
  props: React.ComponentProps<(typeof templates)[K]>
) {
  const Component = templates[template];
  const ReactDOMServer = (await import("react-dom/server")).default;
  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
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
