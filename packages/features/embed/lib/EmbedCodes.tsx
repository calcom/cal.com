import { WEBSITE_URL, IS_SELF_HOSTED, WEBAPP_URL } from "@calcom/lib/constants";

import type { PreviewState } from "../types";
import { embedLibUrl } from "./constants";
import { getApiNameForReactSnippet, getApiNameForVanillaJsSnippet } from "./getApiName";
import { getDimension } from "./getDimension";

export const doWeNeedCalOriginProp = (embedCalOrigin: string) => {
  // If we are self hosted, calOrigin won't be app.cal.com so we need to pass it
  // If we are not self hosted but it's still different from WEBAPP_URL and WEBSITE_URL, we need to pass it -> It happens for organization booking URL at the moment
  return IS_SELF_HOSTED || (embedCalOrigin !== WEBAPP_URL && embedCalOrigin !== WEBSITE_URL);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Codes = {
  react: {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["inline"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      const width = getDimension(previewState.width);
      const height = getDimension(previewState.height);
      const namespaceProp = `${namespace ? `namespace="${namespace}"` : ""}`;
      const argumentForGetCalApi = getArgumentForGetCalApi(namespace);
      return code`
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
export default function MyApp() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      ${uiInstructionCode}
    })();
  }, [])
  return <Cal ${namespaceProp}
    calLink="${calLink}"
    style={{width:"${width}",height:"${height}",overflow:"scroll"}}
    config={${JSON.stringify(previewState.config)}}
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `calOrigin="${embedCalOrigin}"` : ""}
    ${IS_SELF_HOSTED ? `embedJsUrl="${embedLibUrl}"` : ""}
  />;
};`;
    },
    "floating-popup": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      embedCalOrigin: string;
      uiInstructionCode: string;
      namespace: string;
      previewState: PreviewState["floatingPopup"];
    }) => {
      const argumentForGetCalApi = getArgumentForGetCalApi(namespace);
      const floatingButtonArg = JSON.stringify({
        calLink,
        ...(doWeNeedCalOriginProp(embedCalOrigin) ? { calOrigin: embedCalOrigin } : null),
        ...previewState,
      });
      return code`
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
export default function MyApp() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      ${getApiNameForReactSnippet({ mainApiName: "cal" })}("floatingButton", ${floatingButtonArg});
      ${uiInstructionCode}
    })();
  }, [])
};`;
    },
    "element-click": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["elementClick"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      const argumentForGetCalApi = getArgumentForGetCalApi(namespace);
      return code`
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
export default function MyApp() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      ${uiInstructionCode}
    })();
  }, [])
  return <button data-cal-namespace="${namespace}"
    data-cal-link="${calLink}"
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `data-cal-origin="${embedCalOrigin}"` : ""}
    ${`data-cal-config='${JSON.stringify(previewState.config)}'`}
  >Click me</button>;
};`;
    },
    headless: () => {
      return null;
    },
  },
  "react-atom": {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["inline"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      return code`
import { BookerEmbed } from "@calcom/atoms";

// You might need to define or import BookerProps depending on your setup
// For example: type BookerProps = { eventTypeSlug: string; calUsername: string; /* other props */ };
export default function Booker( props : BookerProps ) {
  return (
    <>
      <BookerEmbed
        // Use the parsed username and event slug from calLink
        eventSlug={eventSlug}
        // layout can be of three types: COLUMN_VIEW, MONTH_VIEW or WEEK_VIEW, 
        // you can choose whichever you prefer
        view="${previewState.config?.layout || "MONTH_VIEW"}"
        username={calUsername}
        customClassNames={{
          bookerContainer: "border-subtle border",
        }}
        onCreateBookingSuccess={() => {
          console.log("booking created successfully");
        }}
      />
    </>
  );
};`;
    },
    "floating-popup": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      embedCalOrigin: string;
      uiInstructionCode: string;
      namespace: string;
      previewState: PreviewState["floatingPopup"];
    }) => {
      return code`
import { BookerEmbed } from "@calcom/atoms";

// You might need to define or import BookerProps depending on your setup
export default function Booker( props : BookerProps ) {
  return (
    <>
      <BookerEmbed
        // Use the parsed username and event slug from calLink
        eventSlug={eventSlug}
        // layout can be of three types: COLUMN_VIEW, MONTH_VIEW or WEEK_VIEW, 
        // you can choose whichever you prefer
        view="${previewState.config?.layout || "MONTH_VIEW"}"
        username={calUsername}
        customClassNames={{
          bookerContainer: "border-subtle border",
        }}
        onCreateBookingSuccess={() => {
          console.log("booking created successfully");
        }}
      />
    </>
  );
};`;
    },
    "element-click": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["elementClick"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      return code`
import { BookerEmbed } from "@calcom/atoms";

// You might need to define or import BookerProps depending on your setup
export default function Booker( props : BookerProps ) {
  return (
    <>
      <BookerEmbed
        // Use the parsed username and event slug from calLink
        eventSlug={eventSlug}
        // layout can be of three types: COLUMN_VIEW, MONTH_VIEW or WEEK_VIEW, 
        // you can choose whichever you prefer
        view="${previewState.config?.layout || "MONTH_VIEW"}"
        username={calUsername}
        customClassNames={{
          bookerContainer: "border-subtle border",
        }}
        onCreateBookingSuccess={() => {
          console.log("booking created successfully");
        }}
      />
    </>
  );
};`;
    },
    headless: () => {
      return null;
    },
  },
  HTML: {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["inline"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      return code`${getApiNameForVanillaJsSnippet({ namespace, mainApiName: "Cal" })}("inline", {
    elementOrSelector:"#my-cal-inline-${namespace}",
    config: ${JSON.stringify(previewState.config)},
    calLink: "${calLink}",
  });

  ${uiInstructionCode}`;
    },
    "floating-popup": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["floatingPopup"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      const floatingButtonArg = JSON.stringify({
        calLink,
        ...previewState,
      });
      return code`${getApiNameForVanillaJsSnippet({
        namespace,
        mainApiName: "Cal",
      })}("floatingButton", ${floatingButtonArg}); 
  ${uiInstructionCode}`;
    },
    "element-click": ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState["elementClick"];
      embedCalOrigin: string;
      namespace: string;
    }) => {
      return code`
  // Important: Please add the following attributes to the element that should trigger the calendar to open upon clicking.
  // \`data-cal-link="${calLink}"\`
  // data-cal-namespace="${namespace}"
  // \`data-cal-config='${JSON.stringify(previewState.config)}'\`

  ${uiInstructionCode}`;
    },
    headless: () => {
      return null;
    },
  },
};

/**
 * It allows us to show code with certain reusable blocks indented according to the block variable placement
 * So, if you add a variable ${abc} with indentation of 4 spaces, it will automatically indent all newlines in `abc` with the same indent before constructing the final string
 * `A${var}C` with var = "B" ->   partsWithoutBlock=['A','C'] blocksOrVariables=['B']
 */
const code = (partsWithoutBlock: TemplateStringsArray, ...blocksOrVariables: string[]) => {
  const constructedCode: string[] = [];
  for (let i = 0; i < partsWithoutBlock.length; i++) {
    const partWithoutBlock = partsWithoutBlock[i];
    // blocksOrVariables length would always be 1 less than partsWithoutBlock
    // So, last item should be concatenated as is.
    if (i >= blocksOrVariables.length) {
      constructedCode.push(partWithoutBlock);
      continue;
    }
    const block = blocksOrVariables[i];
    const indentedBlock: string[] = [];
    let indent = "";
    block.split("\n").forEach((line) => {
      indentedBlock.push(line);
    });
    // non-null assertion is okay because we know that we are referencing last element.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const indentationMatch = partWithoutBlock
      .split("\n")
      .at(-1)!
      .match(/(^[\t ]*).*$/);
    if (indentationMatch) {
      indent = indentationMatch[1];
    }
    constructedCode.push(partWithoutBlock + indentedBlock.join(`\n${indent}`));
  }
  return constructedCode.join("");
};

function getArgumentForGetCalApi(namespace: string) {
  const libUrl = IS_SELF_HOSTED ? embedLibUrl : undefined;
  const argumentForGetCalApi = namespace ? { namespace, embedLibUrl: libUrl } : { embedLibUrl: libUrl };
  return argumentForGetCalApi;
}
