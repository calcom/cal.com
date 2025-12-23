"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { emailRegex } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField, EmailField } from "@calcom/ui/components/form";

const FORM_ID = "d4fe10cb-6cb3-4c84-ae61-394a817c419e";
const HEADLESS_ROUTER_URL = "https://i.cal.com/router";

type AdminEmailConsentFormValues = {
  email: string;
  productChangelog: boolean;
  marketingConsent: boolean;
};

const AdminEmailConsent = (props: {
  defaultEmail?: string;
  onSubmit: () => void;
  onSkip: () => void;
  onPrevStep: () => void;
} & Omit<JSX.IntrinsicElements["form"], "onSubmit">) => {
  const { defaultEmail = "", onSubmit, onSkip, onPrevStep, ...rest } = props;
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    email: z
      .string()
      .refine((val) => val === "" || emailRegex.test(val), {
        message: t("enter_valid_email"),
      }),
    productChangelog: z.boolean(),
    marketingConsent: z.boolean(),
  });

  const formMethods = useForm<AdminEmailConsentFormValues>({
    defaultValues: {
      email: defaultEmail,
      productChangelog: false,
      marketingConsent: false,
    },
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = formMethods.handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.append("form", FORM_ID);

      if (values.email) {
        params.append("email", values.email);
      }

      if (values.productChangelog) {
        params.append("consent", "product");
      }

      if (values.marketingConsent) {
        params.append("consent", "marketing");
      }

      const url = `${HEADLESS_ROUTER_URL}?${params.toString()}`;

      await fetch(url, {
        method: "GET",
        mode: "no-cors",
      });
    } catch (error) {
      console.error("Failed to submit admin email consent:", error);
    } finally {
      setIsSubmitting(false);
      onSubmit();
    }
  });

  const handleSkip = () => {
    onSkip();
  };

  return (
    <FormProvider {...formMethods}>
      <form {...rest} className="stack-y-6" onSubmit={handleSubmit}>
        <p className="text-subtle text-sm">
          {t("self_hosted_admin_email_description")}
        </p>

        <div className="stack-y-4">
          <Controller
            name="email"
            control={formMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <EmailField
                label={t("admin_email_label")}
                value={value || ""}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
                className="my-0"
                name="email"
              />
            )}
          />

          <Controller
            name="productChangelog"
            control={formMethods.control}
            render={({ field: { onChange, value } }) => (
              <CheckboxField
                id="product"
                description={t("product_changelog_consent")}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
              />
            )}
          />

          <Controller
            name="marketingConsent"
            control={formMethods.control}
            render={({ field: { onChange, value } }) => (
              <CheckboxField
                id="marketing"
                description={t("marketing_consent")}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" color="secondary" onClick={onPrevStep}>
            {t("prev_step")}
          </Button>
          <Button type="button" color="minimal" onClick={handleSkip}>
            {t("skip")}
          </Button>
          <Button type="submit" color="primary" loading={isSubmitting}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default AdminEmailConsent;
