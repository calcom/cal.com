import dynamic from "next/dynamic";

import { SnippedGenerator, requestSnippets } from "@lib/snippets";

const SwaggerUIDynamic = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
});

export default function APIDocs() {
  return (
    <SwaggerUIDynamic
      url={process.env.NEXT_PUBLIC_SWAGGER_DOCS_URL || "https://api.cal.com/docs"}
      persistAuthorization={true}
      supportedSubmitMethods={["get", "post", "delete", "put", "options", "patch"]}
      requestSnippetsEnabled={true}
      requestSnippets={requestSnippets}
      plugins={[SnippedGenerator]}
      tryItOutEnabled={true}
      docExpansion="list"
      filter={true}
    />
  );
}
