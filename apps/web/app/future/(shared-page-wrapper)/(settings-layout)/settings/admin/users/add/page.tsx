import Page from "@pages/settings/admin/users/add";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Add new user",
    () => "Here you can add a new user."
  );

export default function AppPage() {
  // @ts-expect-error FIXME AppProps | undefined' does not satisfy the constraint 'PageProps'
  return <Page />;
}
