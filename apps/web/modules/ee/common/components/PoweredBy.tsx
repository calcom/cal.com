import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { APP_NAME, POWERED_BY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Link from "next/link";

function getPoweredByLogoUrl(): string {
  // biome-ignore lint/correctness/noProcessGlobal: Next.js inlines NEXT_PUBLIC_ env vars at compile time via the global process object
  const base = process.env.NEXT_PUBLIC_WEBAPP_URL || "";
  try {
    // biome-ignore lint/correctness/noProcessGlobal: Next.js inlines NEXT_PUBLIC_ env vars at compile time via the global process object
    const hashes = JSON.parse(process.env.NEXT_PUBLIC_LOGO_HASHES || "{}") as Record<string, string>;
    const hash = hashes.logo;
    if (hash) {
      return `${base}/api/logo?type=logo&v=${hash}`;
    }
  } catch {
    // Fall through
  }
  return `${base}/api/logo`;
}

const PoweredByCal = ({
  logoOnly,
  hasValidLicense,
}: {
  logoOnly?: boolean;
  hasValidLicense?: boolean | null;
}) => {
  const { t } = useLocale();
  const isEmbed = useIsEmbed();

  return (
    <div className={`p-2 text-center text-xs sm:text-right${isEmbed ? " max-w-3xl" : ""}`}>
      <Link href={POWERED_BY_URL} target="_blank" className="text-subtle">
        {!logoOnly && <>{t("powered_by")} </>}
        {APP_NAME === "Cal.com" || !hasValidLicense ? (
          <>
            <img
              className="-mt-px inline h-[10px] w-auto dark:invert"
              src={getPoweredByLogoUrl()}
              alt="Cal.com Logo"
            />
          </>
        ) : (
          <span className="text-emphasis font-semibold opacity-50 hover:opacity-100">{APP_NAME}</span>
        )}
      </Link>
    </div>
  );
};

export default PoweredByCal;
