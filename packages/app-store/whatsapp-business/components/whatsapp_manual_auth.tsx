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

export function WhatsappManualAuth() {
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
    <div>
      <div className="bg-default dark:bg-muted border-subtle rounded">
        <Form form={form}>
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
              onClick={async () => {}}
              loading={form.formState.isSubmitting}
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
