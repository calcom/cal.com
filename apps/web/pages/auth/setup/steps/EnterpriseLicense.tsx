import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";
import { Controller, useForm, FormProvider } from "react-hook-form";
import * as z from "zod";

import { CONSOLE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, TextField } from "@calcom/ui";

const schemaLicenseKey = z.object({
  licenseKey: z
    .string()
    .uuid({
      message: "License key must follow UUID format: 8-4-4-4-12",
    })
    .superRefine(async (data, ctx) => {
      const parse = z.string().uuid().safeParse(data);
      if (parse.success) {
        const response = await fetch(`${CONSOLE_URL}/api/license?key=${data}`);
        const json = await response.json();
        if (!json.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `License key ${json.message.toLowerCase()}`,
          });
        }
      }
    }),
});

type EnterpriseLicenseFormValues = {
  licenseKey: string;
};

const EnterpriseLicense = (props: {
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsEnabled: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const mutation = trpc.viewer.auth.deploymentSetup.useMutation({
    onSuccess: () => {
      router.replace(`/auth/setup?step=4`);
    },
  });

  const formMethods = useForm<EnterpriseLicenseFormValues>({
    defaultValues: {
      licenseKey: "",
    },
    resolver: zodResolver(schemaLicenseKey),
  });

  const handleSubmit = formMethods.handleSubmit(({ licenseKey }) => {
    props.setIsLoading(true);
    mutation.mutate({ licenseKey });
  });

  return (
    <FormProvider {...formMethods}>
      <form id="wizard-step-3" name="wizard-step-3" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Button
            className="w-full justify-center text-lg"
            EndIcon={Icon.FiExternalLink}
            href="https://console.cal.com"
            target="_blank">
            {t("purchase_license")}
          </Button>
          <div className="relative flex justify-center">
            <hr className="my-8 w-full border-[1.5px] border-gray-200" />
            <span className="absolute mt-[22px] bg-white px-3.5 text-sm">OR</span>
          </div>
          {t("already_have_key")}
          <Controller
            name="licenseKey"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                className="mt-1"
                placeholder="c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd"
                labelSrOnly={true}
                value={value}
                color={formMethods.formState.errors.licenseKey ? "warn" : ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  formMethods.setValue("licenseKey", e.target.value);
                  await formMethods.trigger("licenseKey");
                  debugger;
                  props.setIsEnabled(formMethods.formState.errors.licenseKey === undefined);
                }}
                id="licenseKey"
                name="licenseKey"
              />
            )}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default EnterpriseLicense;
