import { useIsEmbed } from "@calcom/embed-core/src/embed-iframe";
import { IMPRINT_URL, PRIVACY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const LegalNotice = () => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  if (isEmbed) {
    return null;
  }

  return (
    <div className="p-2 text-center text-xs sm:text-right">
      {IMPRINT_URL ? (
        <a
          target="_blank"
          href={IMPRINT_URL}
          className="opacity-50 hover:opacity-100 dark:text-white"
          rel="noreferrer">
          {t("Imprint")}
        </a>
      ) : null}
      {IMPRINT_URL && PRIVACY_URL ? <span className="opacity-50 dark:text-white">{" | "}</span> : null}
      {PRIVACY_URL ? (
        <a
          target="_blank"
          href={PRIVACY_URL}
          className="opacity-50 hover:opacity-100 dark:text-white"
          rel="noreferrer">
          {t("Privacy")}
        </a>
      ) : null}
    </div>
  );
};

export default LegalNotice;
