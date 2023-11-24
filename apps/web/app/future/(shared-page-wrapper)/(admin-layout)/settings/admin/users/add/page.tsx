import Page from "@pages/settings/admin/users/add";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Add new user",
    () => "Here you can add a new user."
  );

export default Page;
