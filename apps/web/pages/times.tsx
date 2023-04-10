/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Login(props: any) {
  return <pre>{JSON.stringify(props, null, "  ")}</pre>;
}

let hot = false;
// TODO: Once we understand how to retrieve prop types automatically from getServerSideProps, remove this temporary variable
export const getServerSideProps = async function getServerSideProps(): Promise<any> {
  const wasHot = hot;
  hot = true;
  const dependencies = {
    "@calcom/prisma": import("@calcom/prisma"),
    classnames: import("classnames"),
    jose: import("jose"),
    next: import("next"),
    "next-auth/react": import("next-auth/react"),
    "next/link": import("next/link"),
    "next/router": import("next/router"),
    react: import("react"),
    "react-hook-form": import("react-hook-form"),
    "react-icons/fa": import("react-icons/fa"),
    "@calcom/features/auth/SAMLLogin": import("@calcom/features/auth/SAMLLogin"),
    "@calcom/features/auth/lib/ErrorCode": import("@calcom/features/auth/lib/ErrorCode"),
    "@calcom/features/auth/lib/getServerSession": import("@calcom/features/auth/lib/getServerSession"),
    "@calcom/features/ee/sso/lib/saml": import("@calcom/features/ee/sso/lib/saml"),
    "@calcom/features/ee/sso/lib/jackson": import("@calcom/features/ee/sso/lib/jackson"),
    "@calcom/lib/constants": import("@calcom/lib/constants"),
    "@calcom/lib/getSafeRedirectUrl": import("@calcom/lib/getSafeRedirectUrl"),
    "@calcom/lib/hooks/useLocale": import("@calcom/lib/hooks/useLocale"),
    "@calcom/lib/telemetry": import("@calcom/lib/telemetry"),
    "@calcom/ui": import("@calcom/ui"),
    "@calcom/ui/components/icon": import("@calcom/ui/components/icon"),
    "@lib/types/inferSSRProps": import("@lib/types/inferSSRProps"),
    "@lib/withNonce": import("@lib/withNonce"),
    "@components/AddToHomescreen": import("@components/AddToHomescreen"),
    "@components/auth/TwoFactor": import("@components/auth/TwoFactor"),
    "@components/ui/AuthContainer": import("@components/ui/AuthContainer"),
    "@server/lib/constants": import("@server/lib/constants"),
    "@server/lib/ssr": import("@server/lib/ssr"),
  };
  const times = [Date.now()];
  for (const dep in dependencies) {
    await dependencies[dep as keyof typeof dependencies].then(() => {
      times.push(Date.now());
    });
  }
  const props = {
    times: times.map((time, index) => {
      if (index === 0) {
        return 0;
      }
      return time - times[index - 1];
    }),
    hot: wasHot,
  };
  console.log("timing", props);
  return {
    props,
  };
};
Login.isThemeSupported = false;
