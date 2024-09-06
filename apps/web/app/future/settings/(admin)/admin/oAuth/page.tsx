import LegacyPage from "@pages/settings/admin/oAuth/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "OAuth",
    () => "Add new OAuth Clients"
  );

export default LegacyPage;
