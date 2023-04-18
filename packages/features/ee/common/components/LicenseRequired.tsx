/**
 * @deprecated file
 * All new changes should be made to the V2 file in
 * `/packages/features/ee/common/components/v2/LicenseRequired.tsx`
 */
import DOMPurify from "dompurify";
import { useSession } from "next-auth/react";
import React, { AriaRole, ComponentType, Fragment } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui";
import { FiAlertTriangle } from "@calcom/ui/components/icon";

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
  children: React.ReactNode;
};

/**
 * @deprecated file
 * All new changes should be made to the V2 file in
 * `/packages/features/ee/common/components/v2/LicenseRequired.tsx`
 * This component will only render it's children if the installation has a valid
 * license.
 */
const LicenseRequired = ({ children, as = "", ...rest }: LicenseRequiredProps) => {
  const { t } = useLocale();
  const session = useSession();
  const Component = as || Fragment;
  return (
    <Component {...rest}>
      {session.data?.hasValidLicense ? (
        children
      ) : (
        <EmptyScreen
          Icon={FiAlertTriangle}
          headline={t("enterprise_license")}
          description={
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  t("enterprise_license_description", {
                    consoleUrl: `<a href="https://go.cal.com/console" target="_blank" class="underline">
                ${APP_NAME}
              </a>`,
                    supportMail: `<a href="mailto:sales@cal.com" class="underline">
                sales@cal.com
              </a>`,
                  })
                ),
              }}
            />
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
