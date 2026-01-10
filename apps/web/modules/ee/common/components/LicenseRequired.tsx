"use client";

import { useSession } from "next-auth/react";
import type { AriaRole, ComponentType } from "react";
import React, { Fragment, useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

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
                {t("enterprise_license_locally")} {t("enterprise_license_sales")}{" "}
                <a className="underline" href="https://go.cal.com/get-license">
                  {t("contact_sales")}
                </a>
              </>
            }
          />
          {children}
        </>
      ) : (
        <EmptyScreen
          Icon="triangle-alert"
          headline={t("enterprise_license")}
          buttonRaw={
            <Button color="secondary" href="https://go.cal.com/get-license">
              {t(`contact_sales`)}
            </Button>
          }
          description={t("enterprise_license_sales")}
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
      <div>
        <LicenseRequired>
          <Component {...hocProps} />
        </LicenseRequired>
      </div>
    );

export default LicenseRequired;
