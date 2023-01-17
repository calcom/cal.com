import { signIn } from "next-auth/react";
import { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import z from "zod";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon } from "@calcom/ui";

interface Props {
  samlTenantID: string;
  samlProductID: string;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

const schema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }),
});

export function SAMLLogin({ samlTenantID, samlProductID, setErrorMessage }: Props) {
  const { t } = useLocale();
  const methods = useFormContext();
  const telemetry = useTelemetry();

  const mutation = trpc.viewer.public.samlTenantProduct.useMutation({
    onSuccess: async (data) => {
      await signIn("saml", {}, { tenant: data.tenant, product: data.product });
    },
    onError: (err) => {
      setErrorMessage(t(err.message));
    },
  });

  return (
    <Button
      StartIcon={Icon.FiLock}
      color="secondary"
      data-testid="saml"
      className="flex w-full justify-center"
      onClick={async (event) => {
        event.preventDefault();

        // track Google logins. Without personal data/payload
        telemetry.event(telemetryEventTypes.googleLogin, collectPageParameters());

        if (!HOSTED_CAL_FEATURES) {
          await signIn("saml", {}, { tenant: samlTenantID, product: samlProductID });
          return;
        }

        // Hosted solution, fetch tenant and product from the backend
        const email = methods.getValues("email");
        const parsed = schema.safeParse({ email });

        if (!parsed.success) {
          const {
            fieldErrors: { email },
          } = parsed.error.flatten();

          setErrorMessage(email ? email[0] : null);
          return;
        }

        mutation.mutate({
          email,
        });
      }}>
      {t("signin_with_saml")}
    </Button>
  );
}
