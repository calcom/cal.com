import * as Prism from "prismjs";
import { useLayoutEffect, useRef } from "react";

Prism.languages.markdoc = {
  tag: {
    pattern: /{%(.|\n)*?%}/i,
    inside: {
      tagType: {
        pattern: /^({%\s*\/?)(\w*|-)*\b/i,
        lookbehind: true,
      },
      id: /#(\w|-)*\b/,
      string: /".*?"/,
      equals: /=/,
      number: /\b\d+\b/i,
      variable: {
        pattern: /\$[\w.]+/i,
        inside: {
          punctuation: /\./i,
        },
      },
      function: /\b\w+(?=\()/,
      punctuation: /({%|\/?%})/i,
      boolean: /false|true/,
    },
  },
  variable: {
    pattern: /\$\w+/i,
  },
  function: {
    pattern: /\b\w+(?=\()/i,
  },
};

export function Code({ children, "data-language": language }: any) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current, false);
  }, [children]);

  const lang = language === "md" ? "markdoc" : language || "markdoc";

  return (
    <pre
      // Prevents "Failed to execute 'removeChild' on 'Node'" error
      // https://stackoverflow.com/questions/54880669/react-domexception-failed-to-execute-removechild-on-node-the-node-to-be-re
      key={children}
      ref={ref}
      className={`language-${lang}`}
    >
      {children}
    </pre>
  );
}
