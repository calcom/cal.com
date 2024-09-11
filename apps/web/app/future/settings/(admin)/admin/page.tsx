import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Admin",
    () => "admin_description"
  );

const Page = () => {
  return <h1>Admin index</h1>;
};
export default Page;
