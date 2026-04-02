import process from "node:process";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useState } from "react";
import { HelpScout, useChat } from "react-live-chat-loader";

interface HelpscoutMenuItemProps {
  onHelpItemSelect: () => void;
}

export default function HelpscoutMenuItem(props: HelpscoutMenuItemProps) {
  const { onHelpItemSelect } = props;
  const { t } = useLocale();
  const [active, setActive] = useState(false);

  const [, loadChat] = useChat();

  function handleClick() {
    setActive(true);
    loadChat({ open: true });
    onHelpItemSelect();
  }

  if (!process.env.NEXT_PUBLIC_HELPSCOUT_KEY) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium transition">
        {t("contact_support")}
      </button>

      {active && <HelpScout color="#292929" icon="message" horizontalPosition="right" zIndex="1" />}
    </>
  );
}
