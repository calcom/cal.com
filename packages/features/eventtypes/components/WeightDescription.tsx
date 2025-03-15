import type { TFunction } from "i18next";
import Link from "next/link";

import CustomTrans from "@calcom/web/components/CustomTrans";

export default function WeightDescription({ t }: { t: TFunction }) {
  return (
    <CustomTrans t={t} i18nKey="weights_description">
      Weights determine how meetings are distributed among hosts.
      <Link
        className="underline underline-offset-2"
        target="_blank"
        href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#weights">
        Learn more
      </Link>
    </CustomTrans>
  );
}
