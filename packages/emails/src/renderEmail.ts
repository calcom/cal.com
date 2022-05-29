import * as ReactDOMServer from "react-dom/server";

function renderEmail(template: React.ReactElement) {
  return (
    ReactDOMServer.renderToStaticMarkup(template)
      // Remove `<RawHtml />` injected scripts
      .replace(/<script><\/script>/g, "")
      .replace(
        "<html>",
        `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
      )
  );
}

export default renderEmail;
