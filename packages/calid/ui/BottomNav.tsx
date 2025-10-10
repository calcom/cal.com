import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CALID_VERSION,
  COMPANY_NAME,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";

const CalIDVersion = `v${CALID_VERSION}`;

export default function BottomNav() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="text-default flex hidden pb-4 text-xs lg:block">
      <div className="flex justify-between">
        <Link href={WEBSITE_PRIVACY_POLICY_URL} target="_blank" className="hover:underline">
          Privacy Policy
        </Link>
        •
        <Link href={WEBSITE_TERMS_URL} target="_blank" className="hover:underline">
          Terms of service
        </Link>
      </div>
      <div className="flex justify-center">
        <small className="mt-1 items-center">
          &copy; {new Date().getFullYear()}{" "}
          <Link href="https://onehash.ai" target="_blank" className="hover:underline">
            {COMPANY_NAME}
          </Link>{" "}
          {hasMounted && (
            <>
              <Link
                href="https://github.com/onehashai/Cal-Id/releases"
                target="_blank"
                className="hover:underline">
                {CalIDVersion}
              </Link>
            </>
          )}
        </small>
      </div>
    </div>
  );
}
