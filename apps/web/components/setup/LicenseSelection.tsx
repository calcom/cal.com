"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Controller, FormProvider, useForm, useFormState } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

type LicenseSelectionFormValues = {
  licenseKey: string;
  signatureToken?: string;
};

type LicenseOption = "FREE" | "EXISTING";

const LicenseSelection = (
  props: {
    value: LicenseOption;
    onChange: (value: LicenseOption) => void;
    onSubmit: (value: LicenseSelectionFormValues) => void;
    onSuccess?: (
      data: RouterOutputs["viewer"]["deploymentSetup"]["update"],
      variables: RouterInputs["viewer"]["deploymentSetup"]["update"]
    ) => void;
    onPrevStep: () => void;
    onNextStep: () => void;
  } & Omit<JSX.IntrinsicElements["form"], "onSubmit" | "onChange">
) => {
  const {
    value: initialValue = "FREE",
    onChange,
    onSubmit,
    onSuccess,
    onPrevStep,
    onNextStep,
    ...rest
  } = props;
  const [value, setValue] = useState<LicenseOption>(initialValue);
  const { t } = useLocale();
  const mutation = trpc.viewer.deploymentSetup.update.useMutation({
    onSuccess,
  });

  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseTouched, setLicenseTouched] = useState(false);

  // Use TRPC query for validation
  const { data: licenseValidation, isLoading: checkLicenseLoading } =
    trpc.viewer.deploymentSetup.validateLicense.useQuery(
      { licenseKey: licenseKeyInput },
      {
        enabled: licenseTouched && licenseKeyInput.trim().length > 0,
      }
    );

  const schemaLicenseKey = useCallback(
    () =>
      z.object({
        licenseKey: z
          .string()
          .min(1, t("license_key_required"))
          .refine(() => !licenseTouched || (licenseValidation ? licenseValidation.valid : true), {
            message: licenseValidation?.message || t("invalid_license_key"),
          }),
        signatureToken: z.string().optional(),
      }),
    [licenseValidation, licenseTouched, t]
  );

  const formMethods = useForm<LicenseSelectionFormValues>({
    defaultValues: {
      licenseKey: "",
      signatureToken: "",
    },
    resolver: zodResolver(schemaLicenseKey()),
  });

  const handleSubmit = formMethods.handleSubmit((values) => {
    onSubmit(values);
    if (value === "EXISTING" && values.licenseKey) {
      mutation.mutate(values);
    }
  });

  const { isDirty, errors } = useFormState(formMethods);

  const handleRadioChange = (newValue: LicenseOption) => {
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <form
      {...rest}
      className="stack-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (value === "FREE") {
          onSubmit({ licenseKey: "", signatureToken: "" });
        } else {
          handleSubmit();
        }
      }}>
      <RadioGroup.Root
        defaultValue={initialValue}
        value={value}
        aria-label={t("choose_a_license")}
        className="grid grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1"
        onValueChange={(value) => handleRadioChange(value as LicenseOption)}>
        <RadioGroup.Item value="FREE" className="h-full">
          <div
            className={classNames(
              "bg-default h-full cursor-pointer stack-y-2 rounded-md border p-4 hover:border-black",
              value === "FREE" && "ring-2 ring-black"
            )}>
            <h2 className="font-cal text-emphasis text-xl">{t("agplv3_license")}</h2>
            <p className="font-medium text-green-800">{t("free_license_fee")}</p>
            <p className="text-subtle">{t("forever_open_and_free")}</p>
            <ul className="text-subtle ml-4 list-disc text-left text-xs">
              <li>{t("required_to_keep_your_code_open_source")}</li>
              <li>{t("cannot_repackage_and_resell")}</li>
              <li>{t("no_enterprise_features")}</li>
            </ul>
          </div>
        </RadioGroup.Item>

        <RadioGroup.Item value="EXISTING" className="h-full">
          <div
            className={classNames(
              "bg-default h-full cursor-pointer stack-y-2 rounded-md border p-4 hover:border-black",
              value === "EXISTING" && "ring-2 ring-black"
            )}>
            <h2 className="font-cal text-emphasis text-xl">{t("enter_license_key")}</h2>
            <p className="font-medium text-green-800">{t("enter_existing_license")}</p>
            <p className="text-subtle">{t("enter_your_license_key")}</p>
            <p className="text-subtle text-xs">
              {t("need_a_license")}{" "}
              <Link
                href="https://go.cal.com/self-hosted"
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 hover:underline">
                {t("purchase_license")}
              </Link>
            </p>
          </div>
        </RadioGroup.Item>
      </RadioGroup.Root>

      {value === "EXISTING" && (
        <FormProvider {...formMethods}>
          <div className="bg-cal-muted stack-y-4 rounded-md px-4 py-3">
            <div className="stack-y-4">
              <div>
                <Controller
                  name="licenseKey"
                  control={formMethods.control}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      name="licenseKey"
                      label={t("license_key")}
                      className={classNames(
                        "group-hover:border-emphasis mb-0",
                        (checkLicenseLoading || (errors.licenseKey === undefined && isDirty)) && "border-r-0"
                      )}
                      placeholder="cal_live_XXXXXXXXXXX"
                      value={licenseKeyInput}
                      addOnClassname={classNames(
                        "hover:border-default",
                        errors.licenseKey === undefined && isDirty && "group-hover:border-emphasis"
                      )}
                      addOnSuffix={
                        checkLicenseLoading ? (
                          <Icon name="loader" className="h-5 w-5 animate-spin" />
                        ) : licenseValidation?.valid && licenseTouched ? (
                          <Icon name="check" className="h-5 w-5 text-green-700" />
                        ) : undefined
                      }
                      color={errors.licenseKey ? "warn" : ""}
                      onBlur={(e) => {
                        setLicenseTouched(true);
                        onBlur();
                      }}
                      onChange={(e) => {
                        setLicenseKeyInput(e.target.value);
                        onChange(e.target.value);
                      }}
                    />
                  )}
                />
                {errors.licenseKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.licenseKey.message}</p>
                )}
              </div>

              <div>
                <Controller
                  name="signatureToken"
                  control={formMethods.control}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      name="signatureToken"
                      label={t("signature_token_optional")}
                      placeholder="cal_sk_XXXXXXXXXXX"
                      value={value || ""}
                      onBlur={onBlur}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        onChange(e.target.value);
                        formMethods.setValue("signatureToken", e.target.value);
                      }}
                    />
                  )}
                />
                <p className="text-subtle mt-1 text-sm">{t("signature_token_description")}</p>
              </div>
            </div>
          </div>
        </FormProvider>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" color="secondary" onClick={onPrevStep}>
          {t("prev_step")}
        </Button>
        {value === "EXISTING" ? (
          <Button
            type="submit"
            color="primary"
            loading={checkLicenseLoading || mutation.isPending}
            disabled={
              value === "EXISTING" &&
              (!formMethods.formState.isValid || checkLicenseLoading || mutation.isPending)
            }>
            {t("save_license_key")}
          </Button>
        ) : (
          <Button color="primary" onClick={onNextStep} type="button">
            {t("next_step")}
          </Button>
        )}
      </div>
    </form>
  );
};

export default LicenseSelection;
