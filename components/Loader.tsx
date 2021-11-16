import { trpc } from "@lib/trpc";

import CustomBranding from "@components/CustomBranding";

export default function Loader() {
  const query = trpc.useQuery(["viewer.me"]);
  const user = query.data;

  return (
    <div className="loader border-brand dark:border-white">
      <CustomBranding val={user?.brandColor || "#292929"} />
      <span className="loader-inner bg-brand dark:bg-white"></span>
    </div>
  );
}
