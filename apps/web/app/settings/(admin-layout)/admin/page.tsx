import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    () => ""
  );

const Page = () => <h1>Admin index</h1>;
export default Page;
