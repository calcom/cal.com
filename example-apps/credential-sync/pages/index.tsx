import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Index() {
  const [data, setData] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const appSlug = searchParams?.get("appSlug");
  const userId = searchParams?.get("userId");

  useEffect(() => {
    let isRedirectNeeded = false;
    const newSearchParams = new URLSearchParams(new URL(document.URL).searchParams);
    if (!userId) {
      newSearchParams.set("userId", "1");
      isRedirectNeeded = true;
    }

    if (!appSlug) {
      newSearchParams.set("appSlug", "google-calendar");
      isRedirectNeeded = true;
    }

    if (isRedirectNeeded) {
      router.push(`${pathname}?${newSearchParams.toString()}`);
    }
  }, [router, pathname, userId, appSlug]);

  async function updateToken({ invalid } = { invalid: false }) {
    const res = await fetch(
      `/api/setTokenInCalCom?invalid=${invalid ? 1 : 0}&userId=${userId}&appSlug=${appSlug}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    setData(JSON.stringify(data));
  }

  return (
    <div>
      <h1>Welcome to Credential Sync Playground</h1>
      <p>
        You are managing credentials for cal.com <strong>userId={userId}</strong> for{" "}
        <strong>appSlug={appSlug}</strong>. Update query params to manage a different user or app{" "}
      </p>
      <button onClick={() => updateToken({ invalid: true })}>Give an invalid token to Cal.com</button>
      <button onClick={() => updateToken()}>Give a valid token to Cal.com</button>
      <div>{data}</div>
    </div>
  );
}
