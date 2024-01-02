import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";

import { CalProvider } from "@calcom/platform-atoms/components";
import "@calcom/platform-atoms/dist/globals.min.css";

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

  return (
    <div>
      <CalProvider
        accessToken={accessToken}
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        clientId={process.env.NEXT_PUBLIC_X_CAL_ID ?? ""}
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        options={{ apiUrl: process.env.NEXT_PUBLIC_CALCOM_API_URL ?? "", refreshUrl: "/api/refresh" }}>
        {email ? (
          <p className="m-12 text-lg">{email}</p>
        ) : (
          <button
            className="m-4 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => {
              const randomEmail = generateRandomEmail();
              fetch("/api/managed-user", {
                method: "POST",

                body: JSON.stringify({ email: randomEmail }),
              }).then(async (res) => {
                const data = await res.json();
                setAccessToken(data.accessToken);
                setUserEmail(data.email);
              });
            }}>
            Create User
          </button>
        )}
        <Component {...pageProps} />
      </CalProvider>{" "}
    </div>
  );
}
