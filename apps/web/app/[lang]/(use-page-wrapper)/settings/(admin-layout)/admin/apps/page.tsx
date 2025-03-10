import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";

const Page = () => {
  redirect("/settings/admin/apps/calendar");
};

export default Page;
