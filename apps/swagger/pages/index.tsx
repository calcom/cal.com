import SwaggerUI from "swagger-ui-react";

import { SnippedGenerator } from "../lib/snippets";

const requestSnippets = {
  generators: {
    curl_bash: {
      title: "cURL (bash)",
      syntax: "bash",
    },
    curl_powershell: {
      title: "cURL (PowerShell)",
      syntax: "powershell",
    },
    curl_cmd: {
      title: "cURL (CMD)",
      syntax: "bash",
    },
    node: {
      title: "Node",
      syntax: "node",
    },
  },
  defaultExpanded: true,
  languages: ["node"],
  // e.g. only show curl bash = ["curl_bash"]
};
export default function APIDocs() {
  return (
    <SwaggerUI
      url={process.env.NEXT_PUBLIC_SWAGGER_DOCS_URL || "https://api.cal.com/docs"}
      supportedSubmitMethods={["get", "post", "put", "delete", "patch"]}
      // requestSnippets={requestSnippets}
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
