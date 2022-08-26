import { signIn } from "next-auth/react";
import { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/v2";

interface Props {
  email: string;
  samlTenantID: string;
  samlProductID: string;
  hostedCal: boolean;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

export default function SAMLLogin(props: Props) {
  const { t } = useLocale();
  const methods = useFormContext();
  const telemetry = useTelemetry();

  const mutation = trpc.useMutation("viewer.public.samlTenantProduct", {
    onSuccess: async (data) => {
      await signIn("saml", {}, { tenant: data.tenant, product: data.product });
    },
    onError: (err) => {
      props.setErrorMessage(err.message);
    },
  });

  return (
    <div className="mt-5">
      <Button
        color="secondary"
        data-testid="saml"
        className="flex w-full justify-center"
        onClick={async (event) => {
          event.preventDefault();

          // track Google logins. Without personal data/payload
          telemetry.event(telemetryEventTypes.googleLogin, collectPageParameters());

          if (!props.hostedCal) {
            await signIn("saml", {}, { tenant: props.samlTenantID, product: props.samlProductID });
          } else {
            if (props.email.length === 0) {
              props.setErrorMessage(t("saml_email_required"));
              return;
            }
            // hosted solution, fetch tenant and product from the backend
            mutation.mutate({
              email: methods.getValues("email"),
            });
          }
        }}>
        {t("signin_with_saml")}
      </Button>
    </div>
  );
}
