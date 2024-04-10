import { redirect } from "next/navigation";

const getPageProps = () => {
  return redirect(`/apps/routing-forms/forms`);
};
const Page = () => {
  getPageProps();

  return null;
};

export default Page;
