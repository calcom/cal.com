import type { TFunction } from "i18next";
import Link from "next/link";

import ServerTrans from "@calcom/lib/components/ServerTrans";

export default function MultiRRHostDescription({ t }: { t: TFunction }) {
  return (
    <ServerTrans
      t={t}
      i18nKey="multi_rr_hosts_description"
      components={[
        <Link
          key="multi_rr_hosts_description"
          className="underline underline-offset-2"
          target="_blank"
          href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#weights">
          Learn more
        </Link>,
      ]}
    />
  );
}
