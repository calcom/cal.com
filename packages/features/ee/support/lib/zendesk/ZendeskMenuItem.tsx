import Script from "next/script";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const ZENDESK_KEY = process.env.NEXT_PUBLIC_ZENDESK_KEY;

interface ZendeskMenuItemProps {
  onHelpItemSelect: () => void;
}

export default function ZendeskMenuItem(props: ZendeskMenuItemProps) {
  const { onHelpItemSelect } = props;
  const [active, setActive] = useState(false);
  const { t } = useLocale();

  if (!ZENDESK_KEY) return null;

  return (
    <>
      <button
        onClick={() => {
          setActive(true);
          onHelpItemSelect();
        }}
        className="flex w-full px-5 py-2 pr-4 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900">
        {t("contact_support")}
      </button>
      {active && (
        <Script id="ze-snippet" src={"https://static.zdassets.com/ekr/snippet.js?key=" + ZENDESK_KEY} />
      )}
    </>
  );
}
