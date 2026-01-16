import * as templates from "./templates";

/**
 * Decodes ONLY safe HTML entities in text content while preserving HTML tags
 * Fixes issue #26938 where special characters like / display as &#x2F; in emails
 * 
 * Security: Only decodes safe entities. Does NOT decode &lt; or &gt; to prevent HTML injection.
 */
function decodeHTMLContent(html: string): string {
  // Map of safe HTML entities to decode
  // Explicitly excludes &lt; and &gt; to prevent HTML injection attacks
  const safeEntities: Record<string, string> = {
    // Common safe entities
    "&#x2F;": "/",
    "&#x27;": "'",
    "&quot;": '"',
    "&apos;": "'",
    "&amp;": "&",
    // Additional hexadecimal forward slash representations
    "&#47;": "/",
    // Common quote entities
    "&#34;": '"',
    "&#39;": "'",
  };

  let result = html;
  
  // Replace each safe entity with its character
  for (const [entity, char] of Object.entries(safeEntities)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }
  
  return result;
}

async function renderEmail<K extends keyof typeof templates>(
  template: K,
  props: React.ComponentProps<(typeof templates)[K]>
) {
  const Component = templates[template];
  const ReactDOMServer = (await import("react-dom/server")).default;
  
  const renderedHtml =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    ReactDOMServer.renderToStaticMarkup(Component(props))
      // Remove `<RawHtml />` injected scripts
      .replace(/<script><\/script>/g, "")
      .replace(
        "<html>",
        `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
      );
  
  // Decode only safe HTML entities in text content (fixes #26938)
  // Security: Does not decode &lt; or &gt; to prevent HTML injection
  return decodeHTMLContent(renderedHtml);
}

export default renderEmail;
