import { zodResolver } from "@hookform/resolvers/zod";
import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import Link from "next/link";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Form, TextField } from "@calcom/ui";

const chooseLicenseSchema = z
  .object({
    licenseKey: z.string().optional(),
    licenseType: z.enum(["FREE", "EE"]),
  })
  .refine(
    (data) => {
      if (data.licenseType === "EE") {
        return data.licenseKey !== undefined;
      }
      return true;
    },
    {
      message: "License key is required for EE license",
      path: ["licenseKey"],
    }
  );

type ChooseLicenseFormValues = z.infer<typeof chooseLicenseSchema>;

const checkAndSaveLicenseKey = async (licenseKey: string) => {
  const response = await fetch(`/api/auth/setup/license?licenseKey=${licenseKey}`, {
    method: "POST",
  });
  const data = await response.json();
  return data.status;
};

enum LicenseStatus {
  UNSET = "UNSET",
  VALID = "VALID",
  INVALID = "INVALID",
}

const ChooseLicense = (props: {
  licenseStatus: LicenseStatus;
  onSuccess: ({ value, licenseKey }: { value: string; licenseKey?: string }) => void;
  licenseKey?: string;
  licenseType?: "FREE" | "EE";
}) => {
  const formMethods = useForm<ChooseLicenseFormValues>({
    defaultValues: {
      licenseKey: props.licenseKey || "",
      licenseType: props.licenseType,
    },
    resolver: zodResolver(chooseLicenseSchema),
  });

  const { t } = useLocale();
  const watchLicenseType = formMethods.watch("licenseType");

  useEffect(() => {
    if (props.licenseStatus === LicenseStatus.INVALID) {
      formMethods.setError("licenseKey", {
        message: "Please enter a valid license key. The one present in your deployment is invalid.",
      });
    }
  }, [props.licenseStatus, formMethods]);

  return (
    <>
      <Form
        form={formMethods}
        className="space-y-4"
        handleSubmit={async (values) => {
          if (values.licenseType === "EE") {
            const licenseKey = values.licenseKey;
            if (licenseKey) {
              const licenseStatus = await checkAndSaveLicenseKey(licenseKey);
              if (!licenseStatus) {
                formMethods.setError("licenseKey", { message: "Invalid license key" });
                return;
              }
            }
          }
          props.onSuccess({
            value: values.licenseType,
            licenseKey: values.licenseKey,
          });
        }}>
        <RadioGroup.Root
          value={watchLicenseType}
          aria-label={t("choose_a_license")}
          className="grid grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1"
          onValueChange={(value: "FREE" | "EE") => {
            formMethods.setValue("licenseType", value);
          }}>
          <RadioGroup.Item value="FREE">
            <div
              className={classNames(
                "bg-default cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
                watchLicenseType === "FREE" && "ring-2 ring-black"
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
          <RadioGroup.Item value="EE" disabled>
            <Link href="https://cal.com/sales" target="_blank">
              <div className={classNames("bg-default h-full cursor-pointer space-y-2 rounded-md border p-4")}>
                <h2 className="font-cal text-emphasis text-xl">{t("custom_plan")}</h2>
                <p className="font-medium text-green-800">{t("contact_sales")}</p>
                <p className="text-subtle">Build on top of Cal.com</p>
                <ul className="text-subtle ml-4 list-disc text-left text-xs">
                  <li>{t("no_need_to_keep_your_code_open_source")}</li>
                  <li>{t("repackage_rebrand_resell")}</li>
                  <li>{t("a_vast_suite_of_enterprise_features")}</li>
                </ul>
              </div>
            </Link>
          </RadioGroup.Item>
        </RadioGroup.Root>
        <div className="my-4 flex items-center justify-center">
          <hr className="border-subtle w-full" />
          <span className="text-subtle mx-4 w-full text-center text-sm font-bold">
            {t("already_have_license_key")}
          </span>
          <hr className="border-subtle w-full" />
        </div>
        <Controller
          control={formMethods.control}
          name="licenseKey"
          render={({ field }) => {
            return (
              <TextField
                error={formMethods.formState.errors.licenseKey?.message}
                label={t("license_key")}
                placeholder="cal_live_XXXXXXXXXXXXXXXXX"
                {...field}
                onChange={(e) => {
                  formMethods.setValue("licenseType", "EE");
                  field.onChange(e);
                }}
              />
            );
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={formMethods.formState.isSubmitting}>
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default ChooseLicense;
