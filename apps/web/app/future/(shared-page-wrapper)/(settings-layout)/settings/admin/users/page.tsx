import Page from "@pages/settings/admin/users/index";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Users",
    () => "A list of all the users in your account including their name, title, email and role."
  );

export default function AppPage() {
  // @ts-expect-error FIXME Property 'Component' is incompatible with index signature
  return <Page />;
}
