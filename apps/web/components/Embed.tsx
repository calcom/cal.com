import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import { NextRouter, useRouter } from "next/router";
import { createRef, forwardRef, MutableRefObject, RefObject, useRef, useState } from "react";
import { components, ControlProps } from "react-select";

import { APP_NAME, EMBED_LIB_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  HorizontalTabs,
  Icon,
  InputLeading,
  Label,
  showToast,
  Switch,
  TextArea,
  TextField,
} from "@calcom/ui";

import ColorPicker from "@components/ui/colorpicker";
import Select from "@components/ui/form/Select";

type EmbedType = "inline" | "floating-popup" | "element-click";
type EmbedFramework = "react" | "HTML";

const enum Theme {
  auto = "auto",
  light = "light",
  dark = "dark",
}

type PreviewState = {
  inline: {
    width: string;
    height: string;
  };
  theme: Theme;
  floatingPopup: Record<string, string>;
  elementClick: Record<string, string>;
  palette: {
    brandColor: string;
  };
  hideEventTypeDetails: boolean;
};
const queryParamsForDialog = ["embedType", "embedTabName", "embedUrl"];

const getDimension = (dimension: string) => {
  if (dimension.match(/^\d+$/)) {
    dimension = `${dimension}%`;
  }
  return dimension;
};

const goto = (router: NextRouter, searchParams: Record<string, string>) => {
  const newQuery = new URLSearchParams(router.asPath.split("?")[1]);
  Object.keys(searchParams).forEach((key) => {
    newQuery.set(key, searchParams[key]);
  });
  router.push(`${router.asPath.split("?")[0]}?${newQuery.toString()}`, undefined, {
    shallow: true,
  });
};

const removeQueryParams = (router: NextRouter, queryParams: string[]) => {
  const params = new URLSearchParams(window.location.search);

  queryParams.forEach((param) => {
    params.delete(param);
  });

  router.push(`${router.asPath.split("?")[0]}?${params.toString()}`);
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
    constructedCode.push(partWithoutBlock + indentedBlock.join("\n" + indent));
  }
  return constructedCode.join("");
};

const getInstructionString = ({
  apiName,
  instructionName,
  instructionArg,
}: {
  apiName: string;
  instructionName: string;
  instructionArg: Record<string, unknown>;
}) => {
  return `${apiName}("${instructionName}", ${JSON.stringify(instructionArg)});`;
};

const getEmbedUIInstructionString = ({
  apiName,
  theme,
  brandColor,
  hideEventTypeDetails,
}: {
  apiName: string;
  theme?: string;
  brandColor: string;
  hideEventTypeDetails: boolean;
}) => {
  theme = theme !== "auto" ? theme : undefined;
  return getInstructionString({
    apiName,
    instructionName: "ui",
    instructionArg: {
      theme,
      styles: {
        branding: {
          brandColor,
        },
      },
      hideEventTypeDetails: hideEventTypeDetails,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Codes: Record<string, Record<string, (...args: any[]) => string>> = {
  react: {
    inline: ({
      calLink,
      uiInstructionCode,
      previewState,
    }: {
      calLink: string;
      uiInstructionCode: string;
      previewState: PreviewState;
    }) => {
      const width = getDimension(previewState.inline.width);
      const height = getDimension(previewState.inline.height);
      return code`
import Cal, { getCalApi } from "@calcom/embed-react";

function MyComponent() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi();
      ${uiInstructionCode}
    })();
  }, [])
  return <Cal calLink="${calLink}" style={{width:"${width}",height:"${height}",overflow:"scroll"}} />;
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
import Cal, { getCalApi } from "@calcom/embed-react";

function MyComponent() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi();
      Cal("floatingButton", ${floatingButtonArg});
      ${uiInstructionCode}
    })();
  }, [])
};`;
    },
    "element-click": ({ calLink, uiInstructionCode }: { calLink: string; uiInstructionCode: string }) => {
      return code`
import Cal, { getCalApi } from "@calcom/embed-react";

function MyComponent() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi();
      ${uiInstructionCode}
    })();
  }, [])
  return <button data-cal-link="${calLink}" />;
};`;
    },
  },
  HTML: {
    inline: ({ calLink, uiInstructionCode }: { calLink: string; uiInstructionCode: string }) => {
      return code`Cal("inline", {
  elementOrSelector:"#my-cal-inline",
  calLink: "${calLink}"
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
    "element-click": ({ calLink, uiInstructionCode }: { calLink: string; uiInstructionCode: string }) => {
      return code`// Important: Make sure to add \`data-cal-link="${calLink}"\` attribute to the element you want to open Cal on click
${uiInstructionCode}`;
    },
  },
};

const getEmbedTypeSpecificString = ({
  embedFramework,
  embedType,
  calLink,
  previewState,
}: {
  embedFramework: EmbedFramework;
  embedType: EmbedType;
  calLink: string;
  previewState: PreviewState;
}) => {
  const frameworkCodes = Codes[embedFramework];
  if (!frameworkCodes) {
    throw new Error(`No code available for the framework:${embedFramework}`);
  }
  let uiInstructionStringArg: {
    apiName: string;
    theme: PreviewState["theme"];
    brandColor: string;
    hideEventTypeDetails: boolean;
  };
  if (embedFramework === "react") {
    uiInstructionStringArg = {
      apiName: "cal",
      theme: previewState.theme,
      brandColor: previewState.palette.brandColor,
      hideEventTypeDetails: previewState.hideEventTypeDetails,
    };
  } else {
    uiInstructionStringArg = {
      apiName: "Cal",
      theme: previewState.theme,
      brandColor: previewState.palette.brandColor,
      hideEventTypeDetails: previewState.hideEventTypeDetails,
    };
  }
  if (!frameworkCodes[embedType]) {
    throw new Error(`Code not available for framework:${embedFramework} and embedType:${embedType}`);
  }
  if (embedType === "inline") {
    return frameworkCodes[embedType]({
      calLink,
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
      previewState,
    });
  } else if (embedType === "floating-popup") {
    const floatingButtonArg = {
      calLink,
      ...previewState.floatingPopup,
    };
    return frameworkCodes[embedType]({
      floatingButtonArg: JSON.stringify(floatingButtonArg),
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
      previewState,
    });
  } else if (embedType === "element-click") {
    return frameworkCodes[embedType]({
      calLink,
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
      previewState,
    });
  }
  return "";
};

const embeds: {
  illustration: React.ReactElement;
  title: string;
  subtitle: string;
  type: EmbedType;
}[] = [
  {
    title: "Inline Embed",
    subtitle: "Loads your Cal scheduling page directly inline with your other website content",
    type: "inline",
    illustration: (
      <svg
        width="100%"
        height="100%"
        className="rounded-md"
        viewBox="0 0 308 265"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
          fill="white"
        />
        <rect x="24" width="260" height="38.5" rx="2" fill="#E1E1E1" />
        <rect x="24.5" y="51" width="139" height="163" rx="1.5" fill="#F8F8F8" />
        <rect opacity="0.8" x="48" y="74.5" width="80" height="8" rx="2" fill="#E1E1E1" />
        <rect x="48" y="86.5" width="48" height="4" rx="1" fill="#E1E1E1" />
        <rect x="49" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="61" y="99.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="73" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="49" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="61" y="125.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <path
          d="M61 124.5H67V122.5H61V124.5ZM68 125.5V131.5H70V125.5H68ZM67 132.5H61V134.5H67V132.5ZM60 131.5V125.5H58V131.5H60ZM61 132.5C60.4477 132.5 60 132.052 60 131.5H58C58 133.157 59.3431 134.5 61 134.5V132.5ZM68 131.5C68 132.052 67.5523 132.5 67 132.5V134.5C68.6569 134.5 70 133.157 70 131.5H68ZM67 124.5C67.5523 124.5 68 124.948 68 125.5H70C70 123.843 68.6569 122.5 67 122.5V124.5ZM61 122.5C59.3431 122.5 58 123.843 58 125.5H60C60 124.948 60.4477 124.5 61 124.5V122.5Z"
          fill="#3E3E3E"
        />
        <rect x="73" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="49" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="61" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="73" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="137.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="109" y="137.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="121" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="49" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="61" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="73" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="149.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="109" y="149.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="121" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="49" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="61" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="73" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="85" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="97" y="161.5" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="109" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="24.5" y="51" width="139" height="163" rx="1.5" stroke="#292929" />
        <rect x="176" y="50.5" width="108" height="164" rx="2" fill="#E1E1E1" />
        <rect x="24" y="226.5" width="260" height="38.5" rx="2" fill="#E1E1E1" />
      </svg>
    ),
  },
  {
    title: "Floating pop-up button",
    subtitle: "Adds a floating button on your site that launches Cal in a dialog.",
    type: "floating-popup",
    illustration: (
      <svg
        width="100%"
        height="100%"
        className="rounded-md"
        viewBox="0 0 308 265"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
          fill="white"
        />
        <rect x="24" width="260" height="38.5" rx="2" fill="#E1E1E1" />
        <rect x="24" y="50.5" width="120" height="76" rx="2" fill="#E1E1E1" />
        <rect x="24" y="138.5" width="120" height="76" rx="2" fill="#E1E1E1" />
        <rect x="156" y="50.5" width="128" height="164" rx="2" fill="#E1E1E1" />
        <rect x="24" y="226.5" width="260" height="38.5" rx="2" fill="#E1E1E1" />
        <rect x="226" y="223.5" width="66" height="26" rx="2" fill="#292929" />
        <rect x="242" y="235.5" width="34" height="2" rx="1" fill="white" />
      </svg>
    ),
  },
  {
    title: "Pop up via element click",
    subtitle: "Open your Cal dialog when someone clicks an element.",
    type: "element-click",
    illustration: (
      <svg
        width="100%"
        height="100%"
        className="rounded-md"
        viewBox="0 0 308 265"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
          fill="white"
        />
        <rect x="24" width="260" height="38.5" rx="2" fill="#E1E1E1" />
        <rect x="24" y="50.5" width="120" height="76" rx="2" fill="#E1E1E1" />
        <rect x="24" y="138.5" width="120" height="76" rx="2" fill="#E1E1E1" />
        <rect x="156" y="50.5" width="128" height="164" rx="2" fill="#E1E1E1" />
        <rect x="24" y="226.5" width="260" height="38.5" rx="2" fill="#E1E1E1" />
        <rect x="84.5" y="61.5" width="139" height="141" rx="1.5" fill="#F8F8F8" />
        <rect opacity="0.8" x="108" y="85" width="80" height="8" rx="2" fill="#E1E1E1" />
        <rect x="108" y="97" width="48" height="4" rx="1" fill="#E1E1E1" />
        <rect x="109" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="110" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="133" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="169" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="181" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="193" y="110" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="124" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="124" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="169" y="124" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="181" y="124" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="193" y="124" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="136" width="6" height="6" rx="1" fill="#3E3E3E" />
        <path
          d="M121 135H127V133H121V135ZM128 136V142H130V136H128ZM127 143H121V145H127V143ZM120 142V136H118V142H120ZM121 143C120.448 143 120 142.552 120 142H118C118 143.657 119.343 145 121 145V143ZM128 142C128 142.552 127.552 143 127 143V145C128.657 145 130 143.657 130 142H128ZM127 135C127.552 135 128 135.448 128 136H130C130 134.343 128.657 133 127 133V135ZM121 133C119.343 133 118 134.343 118 136H120C120 135.448 120.448 135 121 135V133Z"
          fill="#3E3E3E"
        />
        <rect x="133" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="169" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="181" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="193" y="136" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="148" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="169" y="148" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="181" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="193" y="148" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="160" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="169" y="160" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="181" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="193" y="160" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="109" y="172" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="121" y="172" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="133" y="172" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="145" y="172" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="157" y="172" width="6" height="6" rx="1" fill="#3E3E3E" />
        <rect x="169" y="172" width="6" height="6" rx="1" fill="#C6C6C6" />
        <rect x="84.5" y="61.5" width="139" height="141" rx="1.5" stroke="#292929" />
      </svg>
    ),
  },
];
const tabs = [
  {
    name: "HTML",
    href: "embedTabName=embed-code",
    icon: Icon.FiCode,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState }
    >(function EmbedHtml({ embedType, calLink, previewState }, ref) {
      const { t } = useLocale();
      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLTextAreaElement)) {
        return null;
      }
      return (
        <>
          <div>
            <small className="flex py-4 text-gray-500">
              {t("place_where_cal_widget_appear", { appName: APP_NAME })}
            </small>
          </div>
          <TextArea
            data-testid="embed-code"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-code"
            className="h-[calc(100%-50px)] font-mono"
            style={{ resize: "none", overflow: "auto" }}
            readOnly
            value={
              `<!-- Cal ${embedType} embed code begins -->\n` +
              (embedType === "inline"
                ? `<div style="width:${getDimension(previewState.inline.width)};height:${getDimension(
                    previewState.inline.height
                  )};overflow:scroll" id="my-cal-inline"></div>\n`
                : "") +
              `<script type="text/javascript">
${getEmbedSnippetString()}
${getEmbedTypeSpecificString({ embedFramework: "HTML", embedType, calLink, previewState })}
</script>
<!-- Cal ${embedType} embed code ends -->`
            }
          />
          <p className="hidden text-sm text-gray-500">
            {t(
              "Need help? See our guides for embedding Cal on Wix, Squarespace, or WordPress, check our common questions, or explore advanced embed options."
            )}
          </p>
        </>
      );
    }),
  },
  {
    name: "React",
    href: "embedTabName=embed-react",
    icon: Icon.FiCode,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState }
    >(function EmbedReact({ embedType, calLink, previewState }, ref) {
      const { t } = useLocale();
      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLTextAreaElement)) {
        return null;
      }
      return (
        <>
          <small className="flex py-4 text-gray-500">{t("create_update_react_component")}</small>
          <TextArea
            data-testid="embed-react"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-react"
            className="h-[calc(100%-50px)] font-mono"
            readOnly
            style={{ resize: "none", overflow: "auto" }}
            value={`/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react
${getEmbedTypeSpecificString({ embedFramework: "react", embedType, calLink, previewState })}
`}
          />
        </>
      );
    }),
  },
  {
    name: "Preview",
    href: "embedTabName=embed-preview",
    icon: Icon.FiTrello,
    type: "iframe",
    Component: forwardRef<
      HTMLIFrameElement | HTMLTextAreaElement | null,
      { calLink: string; embedType: EmbedType; previewState: PreviewState }
    >(function Preview({ calLink, embedType }, ref) {
      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLIFrameElement)) {
        return null;
      }
      return (
        <iframe
          ref={ref as typeof ref & MutableRefObject<HTMLIFrameElement>}
          data-testid="embed-preview"
          className="h-[100vh] border"
          width="100%"
          height="100%"
          src={`${WEBAPP_URL}/embed/preview.html?embedType=${embedType}&calLink=${calLink}`}
        />
      );
    }),
  },
];

function getEmbedSnippetString() {
  // TODO: Import this string from @calcom/embed-snippet
  return `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); return; } p(cal, ar); }; })(window, "${EMBED_LIB_URL}", "init");
Cal("init", {origin:"${WEBAPP_URL}"});
`;
}

const ThemeSelectControl = ({ children, ...props }: ControlProps<{ value: Theme; label: string }, false>) => {
  return (
    <components.Control {...props}>
      <Icon.FiSun className="ml-2 h-4 w-4 text-gray-500" />
      {children}
    </components.Control>
  );
};

const ChooseEmbedTypesDialogContent = () => {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <DialogContent type="creation" size="lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
          {t("how_you_want_add_cal_site", { appName: APP_NAME })}
        </h3>
        <div>
          <p className="text-sm text-gray-500">{t("choose_ways_put_cal_site", { appName: APP_NAME })}</p>
        </div>
      </div>
      <div className="flex items-start">
        {embeds.map((embed, index) => (
          <button
            className="w-1/3 border border-transparent p-3 text-left hover:rounded-md hover:border-gray-200 hover:bg-gray-100 ltr:mr-2 rtl:ml-2"
            key={index}
            data-testid={embed.type}
            onClick={() => {
              goto(router, {
                embedType: embed.type,
              });
            }}>
            <div className="order-none box-border flex-none rounded-sm border border-solid bg-white">
              {embed.illustration}
            </div>
            <div className="mt-2 font-medium text-gray-900">{embed.title}</div>
            <p className="text-sm text-gray-500">{embed.subtitle}</p>
          </button>
        ))}
      </div>
    </DialogContent>
  );
};

const EmbedTypeCodeAndPreviewDialogContent = ({
  embedType,
  embedUrl,
}: {
  embedType: EmbedType;
  embedUrl: string;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const s = (href: string) => {
    const searchParams = new URLSearchParams(router.asPath.split("?")[1] || "");
    const [a, b] = href.split("=");
    searchParams.set(a, b);
    return `${router.asPath.split("?")[0]}?${searchParams.toString()}`;
  };
  const parsedTabs = tabs.map((t) => ({ ...t, href: s(t.href) }));
  const embedCodeRefs: Record<typeof tabs[0]["name"], RefObject<HTMLTextAreaElement>> = {};
  tabs
    .filter((tab) => tab.type === "code")
    .forEach((codeTab) => {
      embedCodeRefs[codeTab.name] = createRef();
    });

  const refOfEmbedCodesRefs = useRef(embedCodeRefs);
  const embed = embeds.find((embed) => embed.type === embedType);

  const [isEmbedCustomizationOpen, setIsEmbedCustomizationOpen] = useState(true);
  const [isBookingCustomizationOpen, setIsBookingCustomizationOpen] = useState(true);
  const [previewState, setPreviewState] = useState({
    inline: {
      width: "100%",
      height: "100%",
    },
    theme: Theme.auto,
    floatingPopup: {},
    elementClick: {},
    hideEventTypeDetails: false,
    palette: {
      brandColor: "#000000",
    },
  });

  const close = () => {
    removeQueryParams(router, ["dialog", ...queryParamsForDialog]);
  };

  // Use embed-code as default tab
  if (!router.query.embedTabName) {
    goto(router, {
      embedTabName: "embed-code",
    });
  }

  if (!embed || !embedUrl) {
    close();
    return null;
  }

  const calLink = decodeURIComponent(embedUrl);

  const addToPalette = (update: typeof previewState["palette"]) => {
    setPreviewState((previewState) => {
      return {
        ...previewState,
        palette: {
          ...previewState.palette,
          ...update,
        },
      };
    });
  };

  const previewInstruction = (instruction: { name: string; arg: unknown }) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        mode: "cal:preview",
        type: "instruction",
        instruction,
      },
      "*"
    );
  };

  const inlineEmbedDimensionUpdate = ({ width, height }: { width: string; height: string }) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        mode: "cal:preview",
        type: "inlineEmbedDimensionUpdate",
        data: {
          width: getDimension(width),
          height: getDimension(height),
        },
      },
      "*"
    );
  };

  previewInstruction({
    name: "ui",
    arg: {
      theme: previewState.theme,
      hideEventTypeDetails: previewState.hideEventTypeDetails,
      styles: {
        branding: {
          ...previewState.palette,
        },
      },
    },
  });

  if (embedType === "floating-popup") {
    previewInstruction({
      name: "floatingButton",
      arg: {
        attributes: {
          id: "my-floating-button",
        },
        ...previewState.floatingPopup,
      },
    });
  }

  if (embedType === "inline") {
    inlineEmbedDimensionUpdate({
      width: previewState.inline.width,
      height: previewState.inline.height,
    });
  }

  const ThemeOptions = [
    { value: Theme.auto, label: "Auto Theme" },
    { value: Theme.dark, label: "Dark Theme" },
    { value: Theme.light, label: "Light Theme" },
  ];

  const FloatingPopupPositionOptions = [
    {
      value: "bottom-right",
      label: "Bottom Right",
    },
    {
      value: "bottom-left",
      label: "Bottom Left",
    },
  ];

  return (
    <DialogContent size="xl" className="p-0.5" type="creation">
      <div className="flex">
        <div className="flex w-1/3 flex-col bg-gray-50 p-8">
          <h3 className="mb-2 flex text-xl font-bold leading-6 text-gray-900" id="modal-title">
            <button
              onClick={() => {
                removeQueryParams(router, ["embedType", "embedTabName"]);
              }}>
              <Icon.FiArrowLeft className="mr-4 w-4" />
            </button>
            {embed.title}
          </h3>
          <hr className={classNames("mt-4", embedType === "element-click" ? "hidden" : "")} />
          <div className="flex flex-col overflow-y-auto">
            <div className={classNames("mt-4 font-medium", embedType === "element-click" ? "hidden" : "")}>
              <Collapsible
                open={isEmbedCustomizationOpen}
                onOpenChange={() => setIsEmbedCustomizationOpen((val) => !val)}>
                <CollapsibleTrigger
                  type="button"
                  className="flex w-full items-center text-base font-medium text-gray-900">
                  <div>
                    {embedType === "inline"
                      ? "Inline Embed Customization"
                      : embedType === "floating-popup"
                      ? "Floating Popup Customization"
                      : "Element Click Customization"}
                  </div>
                  <Icon.FiChevronRight
                    className={`${
                      isEmbedCustomizationOpen ? "rotate-90 transform" : ""
                    } ml-auto h-5 w-5 text-gray-500`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="text-sm">
                  <div className={classNames("mt-6", embedType === "inline" ? "block" : "hidden")}>
                    {/*TODO: Add Auto/Fixed toggle from Figma */}
                    <div className="text-sm">Embed Window Sizing</div>
                    <div className="justify-left flex items-center">
                      <TextField
                        labelProps={{ className: "hidden" }}
                        required
                        value={previewState.inline.width}
                        onChange={(e) => {
                          setPreviewState((previewState) => {
                            const width = e.target.value || "100%";

                            return {
                              ...previewState,
                              inline: {
                                ...previewState.inline,
                                width,
                              },
                            };
                          });
                        }}
                        addOnLeading={<InputLeading>W</InputLeading>}
                      />
                      <span className="p-2">×</span>
                      <TextField
                        labelProps={{ className: "hidden" }}
                        value={previewState.inline.height}
                        required
                        onChange={(e) => {
                          const height = e.target.value || "100%";

                          setPreviewState((previewState) => {
                            return {
                              ...previewState,
                              inline: {
                                ...previewState.inline,
                                height,
                              },
                            };
                          });
                        }}
                        addOnLeading={<InputLeading>H</InputLeading>}
                      />
                    </div>
                  </div>
                  <div
                    className={classNames(
                      "mt-4 items-center justify-between",
                      embedType === "floating-popup" ? "" : "hidden"
                    )}>
                    <div className="mb-2 text-sm">Button Text</div>
                    {/* Default Values should come from preview iframe */}
                    <TextField
                      labelProps={{ className: "hidden" }}
                      onChange={(e) => {
                        setPreviewState((previewState) => {
                          return {
                            ...previewState,
                            floatingPopup: {
                              ...previewState.floatingPopup,
                              buttonText: e.target.value,
                            },
                          };
                        });
                      }}
                      defaultValue="Book my Cal"
                      required
                    />
                  </div>
                  <div
                    className={classNames(
                      "mt-4 flex items-center justify-start",
                      embedType === "floating-popup" ? "space-x-2 rtl:space-x-reverse" : "hidden"
                    )}>
                    <Switch
                      defaultChecked={true}
                      onCheckedChange={(checked) => {
                        setPreviewState((previewState) => {
                          return {
                            ...previewState,
                            floatingPopup: {
                              ...previewState.floatingPopup,
                              hideButtonIcon: !checked,
                            },
                          };
                        });
                      }}
                    />
                    <div className="text-sm">Display Calendar Icon Button</div>
                  </div>
                  <div
                    className={classNames(
                      "mt-4 items-center justify-between",
                      embedType === "floating-popup" ? "" : "hidden"
                    )}>
                    <div className="mb-2">Position of Button</div>
                    <Select
                      onChange={(position) => {
                        setPreviewState((previewState) => {
                          return {
                            ...previewState,
                            floatingPopup: {
                              ...previewState.floatingPopup,
                              buttonPosition: position?.value,
                            },
                          };
                        });
                      }}
                      defaultValue={FloatingPopupPositionOptions[0]}
                      options={FloatingPopupPositionOptions}
                    />
                  </div>
                  <div className={classNames("mt-4", embedType === "floating-popup" ? "" : "hidden")}>
                    <div>Button Color</div>
                    <div className="w-full">
                      <ColorPicker
                        defaultValue="#000000"
                        onChange={(color) => {
                          setPreviewState((previewState) => {
                            return {
                              ...previewState,
                              floatingPopup: {
                                ...previewState.floatingPopup,
                                buttonColor: color,
                              },
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className={classNames("mt-4", embedType === "floating-popup" ? "" : "hidden")}>
                    <div>Text Color</div>
                    <div className="w-full">
                      <ColorPicker
                        defaultValue="#000000"
                        onChange={(color) => {
                          setPreviewState((previewState) => {
                            return {
                              ...previewState,
                              floatingPopup: {
                                ...previewState.floatingPopup,
                                buttonTextColor: color,
                              },
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <hr className="mt-4" />
            <div className="mt-4 font-medium">
              <Collapsible
                open={isBookingCustomizationOpen}
                onOpenChange={() => setIsBookingCustomizationOpen((val) => !val)}>
                <CollapsibleTrigger className="flex w-full" type="button">
                  <div className="text-base  font-medium text-gray-900">Cal Booking Customization</div>
                  <Icon.FiChevronRight
                    className={`${
                      isBookingCustomizationOpen ? "rotate-90 transform" : ""
                    } ml-auto h-5 w-5 text-gray-500`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-6 text-sm">
                    <div className="mb-4 flex items-center justify-start space-x-2 rtl:space-x-reverse">
                      <Switch
                        checked={previewState.hideEventTypeDetails}
                        onCheckedChange={(checked) => {
                          setPreviewState((previewState) => {
                            return {
                              ...previewState,
                              hideEventTypeDetails: checked,
                            };
                          });
                        }}
                      />
                      <div className="text-sm">{t("hide_eventtype_details")}</div>
                    </div>
                    <Label className="">
                      <div className="mb-2">Theme</div>
                      <Select
                        className="w-full"
                        defaultValue={ThemeOptions[0]}
                        components={{
                          Control: ThemeSelectControl,
                        }}
                        onChange={(option) => {
                          if (!option) {
                            return;
                          }
                          setPreviewState((previewState) => {
                            return {
                              ...previewState,
                              theme: option.value,
                            };
                          });
                        }}
                        options={ThemeOptions}
                      />
                    </Label>
                    {[
                      { name: "brandColor", title: "Brand Color" },
                      // { name: "lightColor", title: "Light Color" },
                      // { name: "lighterColor", title: "Lighter Color" },
                      // { name: "lightestColor", title: "Lightest Color" },
                      // { name: "highlightColor", title: "Highlight Color" },
                      // { name: "medianColor", title: "Median Color" },
                    ].map((palette) => (
                      <Label key={palette.name} className="pb-4">
                        <div className="mb-2 pt-2">{palette.title}</div>
                        <div className="w-full">
                          <ColorPicker
                            defaultValue="#000000"
                            onChange={(color) => {
                              addToPalette({
                                [palette.name as keyof typeof previewState["palette"]]: color,
                              });
                            }}
                          />
                        </div>
                      </Label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
        <div className="flex w-2/3 flex-col p-8">
          <HorizontalTabs data-testid="embed-tabs" tabs={parsedTabs} linkProps={{ shallow: true }} />
          {tabs.map((tab) => {
            return (
              <div
                key={tab.href}
                className={classNames(
                  router.query.embedTabName === tab.href.split("=")[1] ? "flex flex-grow flex-col" : "hidden"
                )}>
                <div className="flex h-[55vh] flex-grow flex-col">
                  {tab.type === "code" ? (
                    <tab.Component
                      embedType={embedType}
                      calLink={calLink}
                      previewState={previewState}
                      ref={refOfEmbedCodesRefs.current[tab.name]}
                    />
                  ) : (
                    <tab.Component
                      embedType={embedType}
                      calLink={calLink}
                      previewState={previewState}
                      ref={iframeRef}
                    />
                  )}
                </div>
                <div className={router.query.embedTabName == "embed-preview" ? "block" : "hidden"} />
                <div className="mt-8 flex flex-row-reverse gap-x-2">
                  {tab.type === "code" ? (
                    <Button
                      type="submit"
                      onClick={() => {
                        const currentTabCodeEl = refOfEmbedCodesRefs.current[tab.name].current;
                        if (!currentTabCodeEl) {
                          return;
                        }
                        navigator.clipboard.writeText(currentTabCodeEl.value);
                        showToast(t("code_copied"), "success");
                      }}>
                      {t("copy_code")}
                    </Button>
                  ) : null}
                  <DialogClose />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DialogContent>
  );
};

export const EmbedDialog = () => {
  const router = useRouter();
  const embedUrl: string = router.query.embedUrl as string;
  return (
    <Dialog
      name="embed"
      clearQueryParamsOnClose={queryParamsForDialog}
      onOpenChange={(open) => {
        if (!open) window.resetEmbedStatus();
      }}>
      {!router.query.embedType ? (
        <ChooseEmbedTypesDialogContent />
      ) : (
        <EmbedTypeCodeAndPreviewDialogContent
          embedType={router.query.embedType as EmbedType}
          embedUrl={embedUrl}
        />
      )}
    </Dialog>
  );
};
type EmbedButtonProps<T> = {
  embedUrl: string;
  children?: React.ReactNode;
  className?: string;
  as?: T;
};

export const EmbedButton = <T extends React.ElementType>({
  embedUrl,
  children,
  className = "",
  as,
  ...props
}: EmbedButtonProps<T> & React.ComponentPropsWithoutRef<T>) => {
  const router = useRouter();
  className = classNames("hidden lg:inline-flex", className);
  const openEmbedModal = () => {
    goto(router, {
      dialog: "embed",
      embedUrl,
    });
  };
  const Component = as ?? Button;

  return (
    <Component
      {...props}
      className={className}
      data-test-embed-url={embedUrl}
      data-testid="embed"
      type="button"
      onClick={() => {
        openEmbedModal();
      }}>
      {children}
    </Component>
  );
};
