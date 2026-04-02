import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useFreshChat } from "./FreshChatProvider";
import { isFreshChatEnabled } from "./FreshChatScript";

interface FreshChatMenuItemProps {
  onHelpItemSelect: () => void;
}

export default function FreshChatMenuItem(props: FreshChatMenuItemProps) {
  const { onHelpItemSelect } = props;
  const { t } = useLocale();

  const { setActive } = useFreshChat();

  if (!isFreshChatEnabled) return null;

  return (
    <>
      <button
        onClick={() => {
          setActive(true);
          onHelpItemSelect();
        }}
        className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium transition">
        {t("contact_support")}
      </button>
    </>
  );
}
