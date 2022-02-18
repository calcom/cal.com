import React, {useEffect} from "react";
import {signIn} from "next-auth/react";
import {useRouter} from "next/router";

const callbackUrl = '/';

export default function KhibraAutoLogin() {
  const router = useRouter();
  const { employerId } = router.query;

  const isServer = typeof window === "undefined";

  const login = async () => {
    if (!employerId) {
      window.location.replace('/auth/login');
      return <></>;
    }
    const credentials = await fetch(`/api/auth/khibra-employer-credentials?employerId=${employerId}`)
      .then((res) => res.json());
    try {
      const response = await signIn("credentials", {
        ...credentials,
        autoLoginKhibraEmployer: true,
        redirect: false,
        totpCode: null,
        callbackUrl,
      });
      if (!response) {
        throw new Error("Received empty response from next auth");
      }
      if (!response.error) {
        // we're logged in! let's do a hard refresh to the desired url
        window.location.replace(callbackUrl);
        return <></>;
      }
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    !isServer && login();
  }, [isServer]);

  return <></>;
}
