import { zodResolver } from "@hookform/resolvers/zod";
import { noop } from "lodash";
import { useCallback, useState } from "react";
import { Controller, FormProvider, useForm, useFormState } from "react-hook-form";
import * as z from "zod";

import { classNames } from "@calcom/lib";
import { CONSOLE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, TextField } from "@calcom/ui";
import { Check, ExternalLink, Loader } from "@calcom/ui/components/icon";

type EnterpriseLicenseFormValues = {
  licenseKey: string;
};

const makeSchemaLicenseKey = (args: { callback: (valid: boolean) => void; onSuccessValidate: () => void }) =>
  z.object({
    licenseKey: z
      .string()
      .uuid({
        message: "License key must follow UUID format: 8-4-4-4-12",
      })
      .superRefine(async (data, ctx) => {
        const parse = z.string().uuid().safeParse(data);
        if (parse.success) {
          args.callback(true);
          const response = await fetch(`${CONSOLE_URL}/api/license?key=${data}`);
          args.callback(false);
          const json = await response.json();
          if (!json.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `License key ${json.message.toLowerCase()}`,
            });
          } else {
            args.onSuccessValidate();
          }
        }
      }),
  });

const EnterpriseLicense = (
  props: {
    licenseKey?: string;
    initialValue?: Partial<EnterpriseLicenseFormValues>;
    onSuccessValidate: () => void;
    onSubmit: (value: EnterpriseLicenseFormValues) => void;
    onSuccess?: (
      data: RouterOutputs["viewer"]["deploymentSetup"]["update"],
      variables: RouterInputs["viewer"]["deploymentSetup"]["update"]
    ) => void;
  } & Omit<JSX.IntrinsicElements["form"], "onSubmit">
) => {
  const { onSubmit, onSuccess = noop, onSuccessValidate = noop, ...rest } = props;
  const { t } = useLocale();
  const [checkLicenseLoading, setCheckLicenseLoading] = useState(false);
  const mutation = trpc.viewer.deploymentSetup.update.useMutation({
    onSuccess,
  });

  const schemaLicenseKey = useCallback(
    () =>
      makeSchemaLicenseKey({
        callback: setCheckLicenseLoading,
        onSuccessValidate,
      }),
    [setCheckLicenseLoading, onSuccessValidate]
  );

  const formMethods = useForm<EnterpriseLicenseFormValues>({
    defaultValues: {
      licenseKey: props.licenseKey || "",
    },
    resolver: zodResolver(schemaLicenseKey()),
  });

  const handleSubmit = formMethods.handleSubmit((values) => {
    onSubmit(values);
    setCheckLicenseLoading(false);
    mutation.mutate(values);
  });

  const { isDirty, errors } = useFormState(formMethods);

  return (
    <FormProvider {...formMethods}>
      <form {...rest} className="bg-default space-y-4 rounded-md px-8 py-10" onSubmit={handleSubmit}>
        <div>
          <Button
            className="w-full justify-center text-lg"
            EndIcon={ExternalLink}
            href="https://console.cal.com"
            target="_blank">
            {t("purchase_license")}
          </Button>
          <div className="relative flex justify-center">
            <hr className="border-subtle my-8 w-full border-[1.5px]" />
            <span className="bg-default absolute mt-[22px] px-3.5 text-sm">OR</span>
          </div>
          {t("already_have_key")}
          <Controller
            name="licenseKey"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                {...formMethods.register("licenseKey")}
                className={classNames(
                  "group-hover:border-emphasis mb-0",
                  (checkLicenseLoading || (errors.licenseKey === undefined && isDirty)) && "border-r-0"
                )}
                placeholder="xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx"
                labelSrOnly={true}
                value={value}
                addOnFilled={false}
                addOnClassname={classNames(
                  "hover:border-default",
                  errors.licenseKey === undefined && isDirty && "group-hover:border-emphasis"
                )}
                addOnSuffix={
                  checkLicenseLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : errors.licenseKey === undefined && isDirty ? (
                    <Check className="h-5 w-5 text-green-700" />
                  ) : undefined
                }
                color={errors.licenseKey ? "warn" : ""}
                onBlur={onBlur}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  onChange(e.target.value);
                  formMethods.setValue("licenseKey", e.target.value);
                  await formMethods.trigger("licenseKey");
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
