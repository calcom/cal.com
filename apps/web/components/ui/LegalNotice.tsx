import { useIsEmbed } from "@calcom/embed-core/src/embed-iframe";
import { IMPRINT_URL, PRIVACY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const LegalNotice = () => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  if (isEmbed) {
    return null;
  }

  if (!(IMPRINT_URL && PRIVACY_URL)) {
    return null;
  }

  return (
    <div className="p-2 text-center text-xs sm:text-right">
      {IMPRINT_URL ? (
        <a
          target="_blank"
          href={IMPRINT_URL}
          className="text-emphasis opacity-50 hover:opacity-100"
          rel="noreferrer">
          {t("Imprint")}
        </a>
      ) : null}
      {IMPRINT_URL && PRIVACY_URL ? <span className="text-emphasis opacity-50">{" | "}</span> : null}
      {PRIVACY_URL ? (
        <a
          target="_blank"
          href={PRIVACY_URL}
          className="text-emphasis opacity-50 hover:opacity-100"
          rel="noreferrer">
          {t("Privacy")}
        </a>
      ) : null}
    </div>
  );
};

export default LegalNotice;
