import { redirect } from "next/navigation";

const Page = () => {
  redirect("https://cal.com/docs/api-reference/v2/introduction");
};

export default Page;

export const unstable_dynamicStaleTime = 30;
