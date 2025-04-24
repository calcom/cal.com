import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description"),
    undefined,
    undefined,
    "/settings/organizations/general"
  );

export { default } from "./(main-page)/page";
