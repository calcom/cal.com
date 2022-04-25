import dynamic from "next/dynamic";

import { SnippedGenerator, requestSnippets } from "@lib/snippets";

const SwaggerUI: any = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function APIDocs() {
  return (
    <SwaggerUI
      url={process.env.NEXT_PUBLIC_SWAGGER_DOCS_URL || "https://api.cal.com/docs"}
      supportedSubmitMethods={["get", "post", "delete", "patch"]}
      requestSnippetsEnabled={true}
      requestSnippets={requestSnippets}
      plugins={[SnippedGenerator]}
      tryItOutEnabled={true}
      syntaxHighlight={true}
      docExpansion="none"
      filter={true}
    />
  );
}
