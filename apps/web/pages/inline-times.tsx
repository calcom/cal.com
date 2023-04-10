/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Login(props: any) {
  return <pre>{JSON.stringify(props, null, "  ")}</pre>;
}
let hot = false;
// TODO: Once we understand how to retrieve prop types automatically from getServerSideProps, remove this temporary variable
export const getServerSideProps = async function getServerSideProps(): Promise<any> {
  const wasHot = hot;
  hot = true;

  const times = [Date.now()];
  await import("@calcom/prisma"); // 0
  times.push(Date.now());
  await import("classnames"); // 1
  times.push(Date.now());
  await import("jose"); // 2
  times.push(Date.now());
  await import("next"); // 3
  times.push(Date.now());
  await import("next-auth/react"); // 4
  times.push(Date.now());
  await import("next/link"); // 5
  times.push(Date.now());
  await import("next/router"); // 6
  times.push(Date.now());
  await import("react"); // 7
  times.push(Date.now());
  await import("react-hook-form"); // 8
  times.push(Date.now());
  await import("react-icons/fa"); // 9
  times.push(Date.now());
  await import("@calcom/features/auth/SAMLLogin"); // 10
  times.push(Date.now());
  await import("@calcom/features/auth/lib/ErrorCode"); // 11
  times.push(Date.now());
  await import("@calcom/features/auth/lib/getServerSession"); // 12
  times.push(Date.now());
  await import("@calcom/features/ee/sso/lib/saml"); // 13
  times.push(Date.now());
  await import("@calcom/lib/constants"); // 14
  times.push(Date.now());
  await import("@calcom/lib/getSafeRedirectUrl"); // 15
  times.push(Date.now());
  await import("@calcom/lib/hooks/useLocale"); // 16
  times.push(Date.now());
  await import("@calcom/lib/telemetry"); // 17
  times.push(Date.now());
  await import("@calcom/ui"); // 18
  times.push(Date.now());
  await import("@calcom/ui/components/icon"); // 19
  times.push(Date.now());
  await import("@lib/types/inferSSRProps"); // 20
  times.push(Date.now());
  await import("@lib/withNonce"); // 21
  times.push(Date.now());
  await import("@lib/withNonce"); // 22
  times.push(Date.now());
  await import("@components/AddToHomescreen"); // 23
  times.push(Date.now());
  await import("@components/auth/TwoFactor"); // 24
  times.push(Date.now());
  await import("@components/ui/AuthContainer"); // 25
  times.push(Date.now());
  await import("@server/lib/constants"); // 26
  times.push(Date.now());
  await import("@server/lib/ssr"); // 27
  times.push(Date.now());
  import("@calcom/features/ee/sso/lib/jackson"); //28
  times.push(Date.now());

  const props = {
    times: times.map((time, index) => {
      if (index === 0) {
        return 0;
      }
      return time - times[index - 1];
    }),
    hot: wasHot,
  };
  console.error("timing", props);
  return {
    props,
  };
};
Login.isThemeSupported = false;
