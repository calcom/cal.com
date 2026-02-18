import { signIn } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import { useFormContext } from "react-hook-form";
import z from "zod";

import { LastUsed, useLastUsed } from "../hooks/useLastUsed";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { emailRegex } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

interface Props {
  samlTenantID: string;
  samlProductID: string;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

const schema = z.object({
  email: z.string().regex(emailRegex, { message: "Please enter a valid email" }),
});

export function SAMLLogin({
  samlTenantID,
  samlProductID,
  setErrorMessage,
  ...buttonProps
}: Props & ButtonProps) {
  const { t } = useLocale();
  const methods = useFormContext();
  const [lastUsed, setLastUsed] = useLastUsed();

  const mutation = trpc.viewer.public.samlTenantProduct.useMutation({
    onSuccess: async (data) => {
      setLastUsed("saml");
      await signIn("saml", {}, { tenant: data.tenant, product: data.product });
    },
    onError: (err) => {
      setErrorMessage(t(err.message));
    },
  });

  return (
    <Button
      StartIcon="lock"
      color="secondary"
      data-testid="samlAndOidc"
      className="flex w-full justify-center"
      onClick={async (event) => {
        event.preventDefault();

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
      }}
      {...buttonProps}>
      <span>{t("signin_with_saml_oidc")}</span>
      {lastUsed === "saml" && <LastUsed />}
    </Button>
  );
}
