import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { POWERED_BY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const PoweredByCal = () => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  return (
    <div className={"p-2 text-center text-xs sm:text-right" + (isEmbed ? " max-w-3xl" : "")}>
      <Link href={POWERED_BY_URL} target="_blank" className="text-subtle opacity-50 hover:opacity-100">
        {t("powered_by")}{" "}
        <img
          className="relative -mt-px inline h-[10px] w-auto dark:hidden"
          src="/cal-logo-word.svg"
          alt="Cal.com Logo"
        />
        <img
          className="relativ -mt-px hidden h-[10px] w-auto dark:inline"
          src="/cal-logo-word-dark.svg"
          alt="Cal.com Logo"
        />
      </Link>
    </div>
  );
};

export default PoweredByCal;
