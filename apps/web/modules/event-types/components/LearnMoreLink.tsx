import type { TFunction } from "i18next";
import Link from "next/link";

import ServerTrans from "@calcom/lib/components/ServerTrans";
import { IS_CALCOM } from "@calcom/lib/constants";

type LearnMoreLinkProps = {
  t: TFunction;
  i18nKey: string;
  href: string;
};

export const LearnMoreLink = ({ t, i18nKey, href }: LearnMoreLinkProps) => {
  if (!IS_CALCOM) {
    const text = t(i18nKey)
      .replace(/<0>[\s\S]*?<\/0>/g, "")
      .trim();
    return <>{text}</>;
  }

  return (
    <ServerTrans
      t={t}
      i18nKey={i18nKey}
      components={[
        <Link
          key={i18nKey}
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
          href={href}>
          Learn more
        </Link>,
      ]}
    />
  );
};
