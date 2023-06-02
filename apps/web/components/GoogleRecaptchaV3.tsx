import React, { useEffect } from "react";

import { useGoogleRecaptchaV3 } from "@lib/hooks/useGoogleRecaptcha";

interface googleRecaptchaV3Props {
  siteKey: string;
  onVerificationSuccess?: () => void;
  onVerificationFail?: () => void;
}

const GoogleRecaptchaV3: React.FC<googleRecaptchaV3Props> = (props) => {
  const { siteKey, onVerificationSuccess, onVerificationFail } = props;

  const { executeCaptchaVerification, scriptLoaded } = useGoogleRecaptchaV3({ siteKey });

  useEffect(() => {
    if (scriptLoaded) {
      executeCaptchaVerification()
        .then(() => {
          if (onVerificationSuccess) {
            onVerificationSuccess();
          }
        })
        .catch(() => {
          if (onVerificationFail) {
            onVerificationFail();
          }
        });
    }
  }, [executeCaptchaVerification, onVerificationFail, onVerificationSuccess, scriptLoaded]);

  return <></>;
};

export default GoogleRecaptchaV3;
