import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";
import Button from "@calcom/ui/v2/core/Button";

const MobileSettingsContainer = (props: { onSideContainerOpen: () => void }) => {
  const { t } = useLocale();

  return (
    <>
      <nav className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 lg:hidden">
        <div className=" flex items-center space-x-3 ">
          <Button
            StartIcon={Icon.FiMenu}
            color="minimalSecondary"
            size="icon"
            onClick={props.onSideContainerOpen}
          />
          <a href="/" className="flex items-center space-x-2 rounded-md px-3 py-1 hover:bg-gray-200">
            <Icon.FiArrowLeft className="text-gray-700" />
            <p className="font-semibold text-black">{t("settings")}</p>
          </a>
        </div>
      </nav>
    </>
  );
};

export default MobileSettingsContainer;
