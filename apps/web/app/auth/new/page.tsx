import { redirect } from "next/navigation";

export default async function Page() {
  redirect(process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com");
}
