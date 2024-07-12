import Page from "@pages/settings/admin/lockedSMS";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "lockedSMS",
    () => "Lock or unlock SMS sending for users"
  );

export default Page;
