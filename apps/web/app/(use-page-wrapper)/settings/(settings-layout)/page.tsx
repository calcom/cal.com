import { _generateMetadata } from "app/_utils";

import SettingsHomeView from "./home/_views/settings-home-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("settings_home_description"),
    undefined,
    undefined,
    "/settings"
  );

const Page = () => {
  return <SettingsHomeView />;
};

export default Page;

export const unstable_dynamicStaleTime = 30;
