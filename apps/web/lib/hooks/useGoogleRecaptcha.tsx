/* eslint-disable @typescript-eslint/ban-ts-comment */
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

interface useGoogleRecaptchaV3Params {
  siteKey: string;
}

export const useGoogleRecaptchaV3 = ({ siteKey }: useGoogleRecaptchaV3Params) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const isClient = useMemo(() => typeof window !== "undefined", []);

  useEffect(() => {
    // Load the Google ReCaptcha V3 Script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.onload = function () {
      setScriptLoaded(true);
    };
    document.head.appendChild(script);
  }, [siteKey]);

  const executeCaptchaVerification = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        if (!scriptLoaded) return reject(`script not loaded`);
        if (!isClient) return reject(`Can be executed only on client`);
        if (!("grecaptcha" in window))
          return reject("grecaptcha not in window, Please make sure that script is loaded");
        //@ts-ignore
        grecaptcha.ready(function () {
          //@ts-ignore
          grecaptcha.execute(siteKey, { action: "submit" }).then(async (token: string) => {
            try {
              const verifyTokenResult = await axios.post<{ success: boolean }>(
                `/api/verify-google-captcha?captchaValidationToken=${token}`
              );
              if (verifyTokenResult && verifyTokenResult.data.success) {
                resolve(token);
              }
            } catch (err) {
              reject(err);
            }
          });
        });
      }),
    [isClient, scriptLoaded, siteKey]
  );

  return { executeCaptchaVerification, scriptLoaded };
};
