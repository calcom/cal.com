import Link from "next/link";
import { useEffect, useState } from "react";

import { COMPANY_NAME, IS_SELF_HOSTED } from "@calcom/lib/constants";
import pkg from "@calcom/web/package.json";

export const CalComVersion = `v.${pkg.version}-${!IS_SELF_HOSTED ? "h" : "sh"}-${
  process.env.CALCOM_LICENSE_KEY === "" ? "ee" : "ce"
}`;

export default function Credits() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <small className="mx-3 mt-1 mb-2 hidden text-[0.5rem] opacity-50 lg:block">
      &copy; {new Date().getFullYear()}{" "}
      <Link href="https://go.cal.com/credits" target="_blank" className="hover:underline">
        {COMPANY_NAME}
      </Link>{" "}
      {hasMounted && (
        <Link href="https://go.cal.com/releases" target="_blank" className="hover:underline">
          {CalComVersion}
        </Link>
      )}
    </small>
  );
}
