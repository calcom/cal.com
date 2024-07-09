import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CalProvider, BookerEmbed } from "@calcom/atoms";
import "@calcom/atoms/globals.min.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "800"] });

function generateRandomEmail() {
  const localPartLength = 10;
  const domain = ["example.com", "example.net", "example.org"];

  const randomLocalPart = Array.from({ length: localPartLength }, () =>
    String.fromCharCode(Math.floor(Math.random() * 26) + 97)
  ).join("");

  const randomDomain = domain[Math.floor(Math.random() * domain.length)];

  return `${randomLocalPart}@${randomDomain}`;
}

export default function App({ Component, pageProps }: AppProps) {
  const [accessToken, setAccessToken] = useState("");
  const [email, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const randomEmail = generateRandomEmail();
    fetch("/api/managed-user", {
      method: "POST",

      body: JSON.stringify({ email: randomEmail }),
    }).then(async (res) => {
      const data = await res.json();
      setAccessToken(data.accessToken);
      setUserEmail(data.email);
      setUsername(data.username);
    });
  }, []);
  return (
    <div className={`${poppins.className} text-black`}>
      <CalProvider
        accessToken={accessToken}
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        clientId={process.env.NEXT_PUBLIC_X_CAL_ID ?? ""}
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        options={{ apiUrl: process.env.NEXT_PUBLIC_CALCOM_API_URL ?? "", refreshUrl: "/api/refresh" }}>
        {email ? (
          <>
            <Component {...pageProps} calUsername={username} calEmail={email} />
          </>
        ) : (
          <>
            <main className={`flex min-h-screen flex-col items-center justify-between p-24 `}>
              <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex" />
            </main>
          </>
        )}
      </CalProvider>{" "}
      {pathname === "/embed" && (
        <div>
          <BookerEmbed
            // customClassNames={{
            //   bookerContainer: "!bg-[#F5F2FE] [&_button:!rounded-full] border-subtle border",
            //   datePickerCustomClassNames: {
            //     datePickerDatesActive: "!bg-[#D7CEF5]",
            //   },
            //   eventMetaCustomClassNames: {
            //     eventMetaTitle: "text-[#7151DC]",
            //   },
            //   availableTimeSlotsCustomClassNames: {
            //     availableTimeSlotsHeaderContainer: "!bg-[#F5F2FE]",
            //     availableTimes: "!bg-[#D7CEF5]",
            //   },
            // }}
            username={username}
            eventSlug="thirty-minutes"
            onCreateBookingSuccess={(data) => {
              router.push(`/${data.data.uid}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
