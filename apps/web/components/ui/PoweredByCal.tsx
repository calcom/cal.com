import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core";

import { useLocale } from "@lib/hooks/useLocale";

const PoweredByCal = () => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();
  return (
    <div className={"p-1 text-center text-xs sm:text-right" + (isEmbed ? " max-w-3xl" : "")}>
      <Link href={`https://cal.com?utm_source=embed&utm_medium=powered-by-button`}>
        <a target="_blank" className="text-bookinglight opacity-50 hover:opacity-100 dark:text-white">
          {t("powered_by")}{" "}
          <img
            className="relative -mt-px inline h-[10px] w-auto dark:hidden"
            src="https://cal.com/logo.svg"
            alt="Cal.com Logo"
          />
          <img
            className="relativ -mt-px hidden h-[10px] w-auto dark:inline"
            src="https://cal.com/logo-white.svg"
            alt="Cal.com Logo"
          />
        </a>
      </Link>
    </div>
  );
};

export default PoweredByCal;
