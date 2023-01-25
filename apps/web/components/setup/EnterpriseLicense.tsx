import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Controller, useForm, FormProvider, useFormState } from "react-hook-form";
import * as z from "zod";

import { classNames } from "@calcom/lib";
import { CONSOLE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, TextField } from "@calcom/ui";
import { FiCheck, FiExternalLink, FiLoader } from "@calcom/ui/components/icon";

type EnterpriseLicenseFormValues = {
  licenseKey: string;
};

const EnterpriseLicense = (props: {
  licenseKey?: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsEnabled: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const [checkLicenseLoading, setCheckLicenseLoading] = useState(false);
  const mutation = trpc.viewer.deploymentSetup.update.useMutation({
    onSuccess: () => {
      router.replace(`/auth/setup?step=4`);
    },
  });

  const schemaLicenseKey = z.object({
    licenseKey: z
      .string()
      .uuid({
        message: "License key must follow UUID format: 8-4-4-4-12",
      })
      .superRefine(async (data, ctx) => {
        const parse = z.string().uuid().safeParse(data);
        if (parse.success) {
          setCheckLicenseLoading(true);
          const response = await fetch(`${CONSOLE_URL}/api/license?key=${data}`);
          setCheckLicenseLoading(false);
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

  const formMethods = useForm<EnterpriseLicenseFormValues>({
    defaultValues: {
      licenseKey: props.licenseKey || "",
    },
    resolver: zodResolver(schemaLicenseKey),
  });

  const handleSubmit = formMethods.handleSubmit(({ licenseKey }) => {
    setCheckLicenseLoading(false);
    props.setIsLoading(true);
    mutation.mutate({ licenseKey });
  });

  const { isDirty, errors } = useFormState(formMethods);

  return (
    <FormProvider {...formMethods}>
      <form
        id="wizard-step-3"
        name="wizard-step-3"
        className="space-y-4 rounded-md bg-white px-8 py-10"
        onSubmit={handleSubmit}>
        <div>
          <Button
            className="w-full justify-center text-lg"
            EndIcon={FiExternalLink}
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
                {...formMethods.register("licenseKey")}
                className={classNames(
                  "mb-0 group-hover:border-gray-400",
                  (checkLicenseLoading || (errors.licenseKey === undefined && isDirty)) && "border-r-0"
                )}
                placeholder="c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd"
                labelSrOnly={true}
                value={value}
                addOnFilled={false}
                addOnClassname={classNames(
                  "hover:border-gray-300",
                  errors.licenseKey === undefined && isDirty && "group-hover:border-gray-400"
                )}
                addOnSuffix={
                  checkLicenseLoading ? (
                    <FiLoader className="h-5 w-5 animate-spin" />
                  ) : errors.licenseKey === undefined && isDirty ? (
                    <FiCheck className="h-5 w-5 text-green-700" />
                  ) : undefined
                }
                color={errors.licenseKey ? "warn" : ""}
                onBlur={onBlur}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  onChange(e.target.value);
                  formMethods.setValue("licenseKey", e.target.value);
                  await formMethods.trigger("licenseKey");
                  props.setIsEnabled(errors.licenseKey === undefined);
                }}
              />
            )}
          />
        </div>
      </form>
    </FormProvider>
  );
};

export default EnterpriseLicense;
