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

export default function WhatsappBusinessSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div className="bg-emphasis flex h-screen dark:bg-inherit">
      <div className="bg-default dark:bg-muted border-subtle m-auto rounded p-5 md:w-[560px] md:p-10 dark:border">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/whatsapp-business/icon.svg"
              alt="WhatsApp Business"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div>
            <h1 className="text-default dark:text-emphasis mb-3 font-semibold">
              {t("connect_whatsapp_business")}
            </h1>

            <div className="my-2 mt-4">
              <Form
                form={form}
              >
                <fieldset
                  className="space-y-4"
                  disabled={form.formState.isSubmitting}
                  data-testid="whatsapp-business-form">
                  <TextField
                    required
                    type="text"
                    {...form.register("phone_number")}
                    label={t("phone_number")}
                    placeholder="Phone number"
                    data-testid="whatsapp-business-phone-number"
                  />
                  <TextField
                    required
                    {...form.register("phone_number_id")}
                    label={t("phone_number_id")}
                    placeholder="Phone Number ID"
                    data-testid="whatsapp-business-phone-number-id"
                  />

                  <TextField
                    required
                    {...form.register("waba_id")}
                    label={t("waba_id")}
                    placeholder="Business ID"
                    data-testid="whatsapp-business-id"
                  />

                  <PasswordField
                    required
                    {...form.register("api_key")}
                    label={t("api_key")}
                    placeholder="•••••••••••••"
                    data-testid="whatsapp-business-api-key"
                  />
                </fieldset>

                {errorMessage && <Alert severity="error" title={errorMessage} className="my-4" />}
                <div className="mt-5 justify-end space-x-2 sm:mt-4 sm:flex rtl:space-x-reverse">
                  <Button type="button" color="secondary" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const values = form.getValues();
                        setErrorMessage("");
                        const res = await fetch("/api/integrations/whatsapp-business/add", {
                          method: "POST",
                          body: JSON.stringify(values),
                          headers: {
                            "Content-Type": "application/json",
                          },
                        });
                        const json = await res.json();
                        if (!res.ok) {
                          setErrorMessage(t(json?.message) || t("something_went_wrong"));
                        } else {
                          router.push(json.url);
                        }
                      } catch (err) {
                        setErrorMessage(t("unable_to_add_whatsapp_business"));
                      }
                    }}
                    loading={form.formState.isSubmitting}
                    data-testid="whatsapp-business-login-button">
                    {t("save")}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
