import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { PasswordField } from "@calid/features/ui/components/input/input";
import { TextField } from "@calid/features/ui/components/input/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

export function WhatsappManualAuth({ teamId }: { teamId?: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      wabaId: "",
      phoneNumberId: "",
      phoneNumber: "",
      api_key: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div>
      <div className="bg-default dark:bg-muted border-subtle rounded">
        <h1 className="mt-1 text-sm font-bold text-center">{t("manual_setup_header")}</h1>
        <h1 className="mt-1 text-sm font-bold text-center">{t("manual_setup_header2")}</h1>
        <Form className="mt-4" form={form}>
          <fieldset
            className="space-y-4"
            disabled={form.formState.isSubmitting}
            data-testid="whatsapp-business-form">
            <TextField
              required
              type="text"
              {...form.register("wabaId")}
              label="WABA ID"
              placeholder="appleid@domain.com"
              data-testid="whatsapp-business-waba-id"
            />
            <TextField
              required
              type="text"
              {...form.register("phoneNumberId")}
              label="Phone Number ID"
              placeholder="appleid@domain.com"
              data-testid="whatsapp-business-waba-id"
            />
            <TextField
              required
              type="text"
              {...form.register("phoneNumber")}
              label="Phone Number"
              placeholder="appleid@domain.com"
              data-testid="whatsapp-business-waba-id"
            />
            <TextField
              required
              {...form.register("api_key")}
              label={t("api_key")}
              placeholder="•••••••••••••"
              data-testid="whatsapp-business-api-key"
            />
          </fieldset>

          {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
          <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
            <Button
              loading={loading}
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  const values = form.getValues();
                  const res = await fetch(
                    `/api/integrations/whatsapp-business/callback?code=${code}${
                      teamId ? `&teamId=${teamId}` : ""
                    }`,
                    {
                      method: "POST",
                      body: JSON.stringify(values),
                      headers: {
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  const json = await res.json();

                  setLoading(false);
                  if (!res.ok) {
                    setErrorMessage(json?.message || json?.error || t("something_went_wrong"));
                  } else {
                    router.push(json.url);
                  }
                } catch (err) {
                  setLoading(false);
                  console.log(err);
                  setErrorMessage(t("unable_to_setup_whatsapp_business"));
                }
              }}
              data-testid="whatsapp-business-login-button">
              {t("save")}
            </Button>
          </div>
        </Form>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
