import Image from "next/image";
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
          <div className="relative -mt-px inline w-auto dark:hidden">
            <Image width={46} height={10} src="/cal-logo-word.svg" alt="Cal.com Logo" layout="fixed" />
          </div>
          <div className="relative -mt-px hidden w-auto dark:inline">
            <Image width={46} height={10} src="/cal-logo-word-dark.svg" alt="Cal.com Logo" layout="fixed" />
          </div>
        </a>
      </Link>
    </div>
  );
};

export default PoweredByCal;
