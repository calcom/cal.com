import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";
import type { AriaRole, ComponentType } from "react";
import React, { Fragment, useEffect } from "react";

import { SUPPORT_MAIL_ADDRESS, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen, Alert } from "@calcom/ui";
import { AlertTriangle } from "@calcom/ui/components/icon";

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
  children: React.ReactNode;
};

const LicenseRequired = ({ children, as = "", ...rest }: LicenseRequiredProps) => {
  const session = useSession();
  const { t } = useLocale();
  const Component = as || Fragment;
  const hasValidLicense = session.data ? session.data.hasValidLicense : null;

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && hasValidLicense === false) {
      // Very few people will see this, so we don't need to translate it
      console.info(
        `You're using a feature that requires a valid license. Please go to ${WEBAPP_URL}/auth/setup to enter a license key.`
      );
    }
  }, []);

  return (
    <Component {...rest}>
      {hasValidLicense === null || hasValidLicense ? (
        children
      ) : process.env.NODE_ENV === "development" ? (
        /** We only show a warning in development mode, but allow the feature to be displayed for development/testing purposes */
        <>
          <Alert
            className="mb-4"
            severity="warning"
            title={
              <>
                {t("enterprise_license")}.{" "}
                <Trans i18nKey="enterprise_license_development">
                  You can test this feature on development mode. For production usage please have an
                  administrator go to{" "}
                  <a href={`${WEBAPP_URL}/auth/setup`} className="underline">
                    /auth/setup
                  </a>{" "}
                  to enter a license key.
                </Trans>
              </>
            }
          />
          {children}
        </>
      ) : (
        <EmptyScreen
          Icon={AlertTriangle}
          headline={t("enterprise_license")}
          description={
            <Trans i18nKey="enterprise_license_description">
              To enable this feature, have an administrator go to{" "}
              <a href={`${WEBAPP_URL}/auth/setup`} className="underline">
                /auth/setup
              </a>
              to enter a license key. If a license key is already in place, please contact{" "}
              <a href={`mailto:${SUPPORT_MAIL_ADDRESS}`} className="underline">
                <Trans>{{ SUPPORT_MAIL_ADDRESS }}</Trans>
              </a>
              for help.
            </Trans>
          }
        />
      )}
    </Component>
  );
};

export const withLicenseRequired =
  <T extends JSX.IntrinsicAttributes>(Component: ComponentType<T>) =>
  // eslint-disable-next-line react/display-name
  (hocProps: T) =>
    (
      <LicenseRequired>
        <Component {...hocProps} />
      </LicenseRequired>
    );

export default LicenseRequired;
