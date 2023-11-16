import { CAL_URL, IS_SELF_HOSTED, WEBAPP_URL } from "@calcom/lib/constants";

import type { PreviewState } from "../types";
import { embedLibUrl } from "./constants";
import { getDimension } from "./getDimension";

export const doWeNeedCalOriginProp = (embedCalOrigin: string) => {
  // If we are self hosted, calOrigin won't be app.cal.com so we need to pass it
  // If we are not self hosted but it's still different from WEBAPP_URL and CAL_URL, we need to pass it -> It happens for organization booking URL at the moment
  return IS_SELF_HOSTED || (embedCalOrigin !== WEBAPP_URL && embedCalOrigin !== CAL_URL);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Codes = {
  react: {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
      embedCalOrigin,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
      embedCalOrigin: string;
    }) => {
      const width = getDimension(previewState.inline.width);
      const height = getDimension(previewState.inline.height);
      return code`
  import Cal, { getCalApi } from "@calcom/embed-react";
  import { useEffect } from "react";
  export default function MyApp() {
	useEffect(()=>{
	  (async function () {
		const cal = await getCalApi();
		${uiInstructionCode}
	  })();
	}, [])
	return <Cal
	  calLink="${calLink}"
	  style={{width:"${width}",height:"${height}",overflow:"scroll"}}
	  ${previewState.layout ? `config={{layout: '${previewState.layout}'}}` : ""}
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `  calOrigin="${embedCalOrigin}"` : ""}
	  ${IS_SELF_HOSTED ? `calJsUrl="${embedLibUrl}"` : ""}
	/>;
  };`;
    },
    "floating-popup": ({
      floatingButtonArg,
      uiInstructionCode,
    }: {
      floatingButtonArg: string;
      uiInstructionCode: string;
    }) => {
      return code`
  import { getCalApi } from "@calcom/embed-react";
  import { useEffect } from "react";
  export default function MyApp() {
	useEffect(()=>{
	  (async function () {
		const cal = await getCalApi(${IS_SELF_HOSTED ? `"${embedLibUrl}"` : ""});
		cal("floatingButton", ${floatingButtonArg});
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
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
      embedCalOrigin: string;
    }) => {
      return code`
  import { getCalApi } from "@calcom/embed-react";
  import { useEffect } from "react";
  export default function MyApp() {
	useEffect(()=>{
	  (async function () {
		const cal = await getCalApi(${IS_SELF_HOSTED ? `"${embedLibUrl}"` : ""});
		${uiInstructionCode}
	  })();
	}, [])
	return <button
	  data-cal-link="${calLink}"
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `  data-cal-origin="${embedCalOrigin}"` : ""}
	  ${`data-cal-config='${JSON.stringify({
      layout: previewState.layout,
    })}'`}
	  >Click me</button>;
  };`;
    },
  },
  HTML: {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
    }) => {
      return code`Cal("inline", {
	elementOrSelector:"#my-cal-inline",
	calLink: "${calLink}",
	layout: "${previewState.layout}"
  });
  
  ${uiInstructionCode}`;
    },

    "floating-popup": ({
      floatingButtonArg,
      uiInstructionCode,
    }: {
      floatingButtonArg: string;
      uiInstructionCode: string;
    }) => {
      return code`Cal("floatingButton", ${floatingButtonArg});
  ${uiInstructionCode}`;
    },
    "element-click": ({
      calLink,
      uiInstructionCode,
      previewState,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
    }) => {
      return code`
  // Important: Please add following attributes to the element you want to open Cal on click
  // \`data-cal-link="${calLink}"\`
  // \`data-cal-config='${JSON.stringify({
    layout: previewState.layout,
  })}'\`
  
  ${uiInstructionCode}`;
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<string, Record<string, (...args: any[]) => string>>;

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
