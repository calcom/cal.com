import { IS_SELF_HOSTED } from "@calcom/lib/constants";

import type { PreviewState } from "../types";
import { embedLibUrl } from "./constants";
import { getDimension } from "./getDimension";

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
      previewState: PreviewState;
      embedCalOrigin: string;
      namespace: string;
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
    ${namespace ? `namespace="${namespace}"` : ""}
	  calLink="${calLink}"
	  style={{width:"${width}",height:"${height}",overflow:"scroll"}}
	  ${previewState.layout ? "config={{layout: '" + previewState.layout + "'}}" : ""}${
        IS_SELF_HOSTED
          ? `
	  calOrigin="${embedCalOrigin}"
	  calJsUrl="${embedLibUrl}"`
          : ""
      }
	/>;
  };`;
    },
    "floating-popup": ({
      floatingButtonArg,
      uiInstructionCode,
      namespace,
    }: {
      floatingButtonArg: string;
      uiInstructionCode: string;
      namespace: string;
    }) => {
      return code`
  import { getCalApi } from "@calcom/embed-react";
  import { useEffect } from "react";
  export default function App() {
	useEffect(()=>{
	  (async function () {
		const cal = await getCalApi(${IS_SELF_HOSTED ? `"${embedLibUrl}"` : ""});
		cal.ns.${namespace}("floatingButton", ${floatingButtonArg});
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
      previewState: PreviewState;
      embedCalOrigin: string;
      namespace: string;
    }) => {
      return code`
  import { getCalApi } from "@calcom/embed-react";
  import { useEffect } from "react";
  export default function App() {
	useEffect(()=>{
	  (async function () {
		const cal = await getCalApi(${IS_SELF_HOSTED ? `"${embedLibUrl}"` : ""});
		${uiInstructionCode}
	  })();
	}, [])
	return <button
    data-cal-namespace="${namespace}"
	  data-cal-link="${calLink}"${IS_SELF_HOSTED ? `\ndata-cal-origin="${embedCalOrigin}"` : ""}
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
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
      namespace: string;
    }) => {
      return code`Cal.ns.${namespace}("inline", {
	elementOrSelector:"#my-cal-inline",
	calLink: "${calLink}",
	layout: "${previewState.layout}"
  });
  
  ${uiInstructionCode}`;
    },

    "floating-popup": ({
      floatingButtonArg,
      uiInstructionCode,
      namespace,
    }: {
      floatingButtonArg: string;
      uiInstructionCode: string;
      namespace: string;
    }) => {
      return code`Cal.ns.${namespace}("floatingButton", ${floatingButtonArg});
  ${uiInstructionCode}`;
    },
    "element-click": ({
      calLink,
      uiInstructionCode,
      previewState,
      namespace,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
      namespace: string;
    }) => {
      return code`
      data-cal-namespace="${namespace}"
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
    constructedCode.push(partWithoutBlock + indentedBlock.join("\n" + indent));
  }
  return constructedCode.join("");
};
