// pages/_app.tsx
import type { Data } from "@/pages/api/get-managed-users";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

import { CalProvider, CalOAuthProvider, BookerEmbed, Router as CalRouter } from "@calcom/atoms";
import "@calcom/atoms/globals.min.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "800"] });
type TUser = Data["users"][0];

function generateRandomEmail(name: string) {
  const localPartLength = 5;
  const domain = ["example.com", "example.net", "example.org"];

  const randomLocalPart = Array.from({ length: localPartLength }, () =>
    String.fromCharCode(Math.floor(Math.random() * 26) + 97)
  ).join("");

  const randomDomain = domain[Math.floor(Math.random() * domain.length)];
  return `${name}-${randomLocalPart}@${randomDomain}`;
}

// note(Lauris): needed because useEffect kicks in twice creating 2 parallel requests
let seeding = false;

export default function App({ Component, pageProps }: AppProps) {
  const [accessToken, setAccessToken] = useState("");
  const [email, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [selectedUser, setSelectedUser] = useState<TUser | null>(null);
  const [options, setOptions] = useState<any[]>([]);

  const router = useRouter();
  const pathname = router.pathname;

  const oAuth2Mode = process.env.NEXT_PUBLIC_OAUTH2_MODE === "true";

  const authorizationCode = useMemo(() => {
    const code = router.query.code;
    return typeof code === "string" ? code : null;
  }, [router.query.code]);

  useEffect(() => {
    fetch("/api/get-users", { method: "get" }).then(async (res) => {
      const data = await res.json();
      if (data.users.length === 1) {
        setAccessToken(data.users[0].accessToken);
        setUserEmail(data.users[0].email);
        setUsername(data.users[0].username);
        return;
      }
      setOptions(
        data.users.map((item: Data["users"][0]) => ({
          ...item,
          value: item.id,
          label: item.username,
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    if (seeding) return;

    if (oAuth2Mode && !authorizationCode) return;

    seeding = true;

    if (oAuth2Mode) {
      const randomEmailOne = generateRandomEmail("keith");

      fetch("/api/oauth2-user", {
        method: "POST",
        body: JSON.stringify({
          email: randomEmailOne,
          authorizationCode,
        }),
      }).then(async (res) => {
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUserEmail(data.email);
        setUsername(data.username);
      });
    } else {
      const randomEmailOne = generateRandomEmail("keith");
      const randomEmailTwo = generateRandomEmail("somay");
      const randomEmailThree = generateRandomEmail("rajiv");
      const randomEmailFour = generateRandomEmail("morgan");
      const randomEmailFive = generateRandomEmail("lauris");

      fetch("/api/managed-user", {
        method: "POST",
        body: JSON.stringify({
          emails: [randomEmailOne, randomEmailTwo, randomEmailThree, randomEmailFour, randomEmailFive],
        }),
      }).then(async (res) => {
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUserEmail(data.email);
        setUsername(data.username);
      });
    }
  }, [router.isReady, oAuth2Mode, authorizationCode]);

  useEffect(() => {
    if (selectedUser) {
      setAccessToken(selectedUser.accessToken);
      setUserEmail(selectedUser.email);
      setUsername(selectedUser.username);
    }
  }, [selectedUser]);

  return (
    <div className={`${poppins.className} text-black`}>
      {options.length > 0 && (
        <Select
          defaultValue={options.find((opt: TUser | null) => opt?.email?.includes("lauris"))}
          onChange={(opt: TUser | null) => setSelectedUser(opt)}
          options={options}
        />
      )}

      {oAuth2Mode ? (
        <CalOAuthProvider
          accessToken={accessToken}
          clientId={process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID}
          options={{
            apiUrl: process.env.NEXT_PUBLIC_CALCOM_API_URL ?? "",
            refreshUrl: "/api/refresh",
          }}>
          {email ? (
            <Component {...pageProps} calUsername={username} calEmail={email} />
          ) : (
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
              <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex" />
            </main>
          )}
        </CalOAuthProvider>
      ) : (
        <CalProvider
          accessToken={accessToken}
          clientId={process.env.NEXT_PUBLIC_X_CAL_ID ?? ""}
          options={{
            apiUrl: process.env.NEXT_PUBLIC_CALCOM_API_URL ?? "",
            refreshUrl: "/api/refresh",
          }}>
          {email ? (
            <Component {...pageProps} calUsername={username} calEmail={email} />
          ) : (
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
              <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex" />
            </main>
          )}
        </CalProvider>
      )}

      {pathname === "/embed" && (
        <div>
          <BookerEmbed
            customClassNames={{
              bookerContainer: "bg-[#F5F2FE]! [&_button:!rounded-full] border-subtle border",
              datePickerCustomClassNames: {
                datePickerDatesActive: "bg-[#D7CEF5]!",
              },
              eventMetaCustomClassNames: {
                eventMetaTitle: "text-[#7151DC]",
              },
              availableTimeSlotsCustomClassNames: {
                availableTimeSlotsHeaderContainer: "bg-[#F5F2FE]!",
                availableTimes: "bg-[#D7CEF5]!",
              },
            }}
            username={username}
            eventSlug="thirty-minutes"
            onCreateBookingSuccess={(data) => {
              router.push(`/${data.data.uid}`);
            }}
          />
        </div>
      )}

      {pathname === "/router" && (
        <div className="p-4">
          <CalRouter
            formId="a63e6fce-899a-404e-8c38-e069710589c5"
            formResponsesURLParams={new URLSearchParams({ isBookingDryRun: "true", Territory: "Europe" })}
            onDisplayBookerEmbed={() => {
              console.log("render booker embed");
            }}
            bannerUrl="https://i0.wp.com/mahala.co.uk/wp-content/uploads/2014/12/img_banner-thin_mountains.jpg?fit=800%2C258&ssl=1"
            bookerCustomClassNames={{
              bookerWrapper: "dark",
            }}
          />
        </div>
      )}
    </div>
  );
}
