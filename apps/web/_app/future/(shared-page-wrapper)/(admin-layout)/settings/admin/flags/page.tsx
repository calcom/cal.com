import Page from "@pages/settings/admin/flags";
import { _generateMetadata } from "_app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Feature Flags",
    () => "Here you can toggle your Cal.com instance features."
  );

export default Page;
