import type { FieldType } from "./schema";

/**
 * Once a component supports `labelAsSafeHtml`, add it's field's type here
 * A whitelist is needed because unless we explicitly use dangerouslySetInnerHTML, React will escape the HTML
 */
export const fieldsThatSupportLabelAsSafeHtml: FieldType[] = ["boolean"];
