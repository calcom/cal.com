import Head from "next/head";

export function BookingPrivacyHead({ hideFromSearchEngines }: { hideFromSearchEngines?: boolean }) {
  if (!hideFromSearchEngines) return null;
  return (
    <Head>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Head>
  );
}
