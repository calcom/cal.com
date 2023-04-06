import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useIntercom } from "./useIntercom";

interface IntercomMenuItemProps {
  onHelpItemSelect: () => void;
}

export default function IntercomMenuItem(props: IntercomMenuItemProps) {
  const { onHelpItemSelect } = props;
  const { t } = useLocale();
  const { open } = useIntercom();
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (!process.env.NEXT_PUBLIC_INTERCOM_APP_ID) return null;

  return (
    <button
      onClick={() => {
        open();
        onHelpItemSelect();
      }}
      className="hover:bg-subtle hover:text-emphasis text-default flex w-full px-5 py-2 pr-4 text-sm font-medium">
      {t("contact_support")}
    </button>
  );
}
