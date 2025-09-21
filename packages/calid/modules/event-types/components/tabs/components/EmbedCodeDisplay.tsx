// packages/calid/modules/event-types/components/tabs/components/EmbedCodeDisplay.tsx
import { Copy } from "lucide-react";
import React, { createRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@calcom/ui/components/dialog";
import { HorizontalTabs } from "@calcom/ui/components/navigation";

// Import the tab components from the existing implementation
const tabs = [
  {
    name: "HTML (iframe)",
    href: "embedTabName=embed-code",
    icon: "code" as const,
    type: "code",
    "data-testid": "HTML",
    Component: React.forwardRef<
      HTMLTextAreaElement,
      { embedType: string; calLink: string; previewState: any; namespace: string }
    >(function EmbedHtml({ embedType, calLink, previewState, namespace }, ref) {
      const { t } = useLocale();

      if (!ref || typeof ref === "function") return null;

      // This would be your embed code generation logic
      const embedCode = `<!-- Cal ${embedType} embed code begins -->
${
  embedType === "inline"
    ? `<div style="width:${previewState.inline?.width || "100%"};height:${
        previewState.inline?.height || "100%"
      };overflow:scroll" id="my-cal-inline-${namespace}"></div>`
    : ""
}
<script type="text/javascript">
  // Your embed snippet code here
  Cal("init", "${namespace}", {origin:"${window.location.origin}"});
  Cal("inline", {
    elementOrSelector: "#my-cal-inline-${namespace}",
    calLink: "${calLink}",
    config: ${JSON.stringify(previewState.config || {})}
  });
</script>
<!-- Cal ${embedType} embed code ends -->`;

      return (
        <textarea
          ref={ref}
          className="h-full w-full resize-none rounded-lg border p-4 font-mono text-sm"
          value={embedCode}
          readOnly
        />
      );
    }),
  },
  {
    name: "React (iframe)",
    href: "embedTabName=embed-react",
    "data-testid": "react",
    icon: "code" as const,
    type: "code",
    Component: React.forwardRef<
      HTMLTextAreaElement,
      { embedType: string; calLink: string; previewState: any; namespace: string }
    >(function EmbedReact({ embedType, calLink, previewState, namespace }, ref) {
      const { t } = useLocale();

      if (!ref || typeof ref === "function") return null;

      const reactCode = `/* First make sure that you have installed the package */
/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "${previewState.theme || "auto"}",
        hideEventTypeDetails: ${previewState.hideEventTypeDetails || false},
        layout: "${previewState.layout || "month"}"
      });
    })();
  }, [])
  
  return <Cal 
    calLink="${calLink}"
    style={{width:"100%",height:"100%",overflow:"scroll"}}
    config={{
      layout: "${previewState.layout || "month"}",
      theme: "${previewState.theme || "auto"}"
    }}
  />;
}`;

      return (
        <textarea
          ref={ref}
          className="h-full w-full resize-none rounded-lg border p-4 font-mono text-sm"
          value={reactCode}
          readOnly
        />
      );
    }),
  },
];

interface EmbedCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  embedType: string;
  generateCode: (type: "html" | "react") => string;
  onCopyCode: (type: "html" | "react") => void;
}

export const EmbedCodeDisplay: React.FC<EmbedCodeDisplayProps> = ({
  isOpen,
  onClose,
  embedType,
  generateCode,
  onCopyCode,
}) => {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = React.useState("embed-code");

  // Create refs for each code tab
  const embedCodeRefs = React.useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLTextAreaElement>> = {};
    tabs.forEach((tab) => {
      if (tab.type === "code") {
        refs[tab.name] = createRef<HTMLTextAreaElement>();
      }
    });
    return refs;
  }, []);

  const handleCopyCode = () => {
    const currentTab = tabs.find((tab) => tab.href.includes(activeTab));
    if (!currentTab) return;

    const currentRef = embedCodeRefs[currentTab.name];
    if (currentRef?.current) {
      navigator.clipboard.writeText(currentRef.current.value);

      // Determine the code type based on tab name
      const codeType = currentTab.name.toLowerCase().includes("react") ? "react" : "html";
      onCopyCode(codeType);
    }
  };

  const tabsData = tabs.map((tab) => ({
    ...tab,
    isActive: tab.href.includes(activeTab),
    onClick: () => setActiveTab(tab.href.split("=")[1]),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-[80vh] max-w-4xl p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t("embed_code_for")} {embedType}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full flex-col">
          {/* Tabs */}
          <div className="px-6 pt-4">
            <HorizontalTabs tabs={tabsData.filter((tab) => tab.type === "code")} />
          </div>

          {/* Code Content */}
          <div className="flex-1 p-6">
            {tabs
              .filter((tab) => tab.type === "code")
              .map((tab) => {
                const isActive = tab.href.includes(activeTab);
                return (
                  <div key={tab.name} className={isActive ? "h-full" : "hidden"}>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {tab.name.includes("React")
                          ? t("create_update_react_component")
                          : t("place_where_cal_widget_appear", { appName: "Cal.com" })}
                      </p>
                    </div>
                    <div className="h-[calc(100%-3rem)]">
                      <tab.Component
                        ref={embedCodeRefs[tab.name]}
                        embedType={embedType}
                        calLink="your-cal-link" // You'll need to pass this from props
                        previewState={{}} // You'll need to pass this from props
                        namespace="default" // You'll need to pass this from props
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <DialogClose />
          <Button onClick={handleCopyCode} className="ml-2">
            <Copy className="mr-2 h-4 w-4" />
            {t("copy_code")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
