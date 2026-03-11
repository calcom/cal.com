"use client";

import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, InputError, TextField } from "@calcom/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";

type FormValues = {
  email: string;
};

export const CompanyEmailRequired = ({ userEmail }: { userEmail: string }) => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const formMethods = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        email: emailSchema.refine((val) => isCompanyEmail(val), {
          message: t("use_company_email_to_create_an_organization"),
        }),
      })
    ),
  });

  useEffect(() => {
    const subscription = formMethods.watch(() => setErrorMessage(""));
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  const addSecondaryEmailMutation = trpc.viewer.loggedInViewerRouter.addSecondaryEmail.useMutation({
    onSuccess: (_res, variables) => {
      setSubmittedEmail(variables.email);
    },
    onError: (error) => {
      setErrorMessage(error?.message || "");
    },
  });

  const handleSubmit = (values: FormValues) => {
    posthog.capture("onboarding_company_email_verify_clicked");
    setErrorMessage("");
    const qs = searchParams?.toString() ?? "";
    const redirectTo = qs ? `${pathname ?? ""}?${qs}` : pathname ?? undefined;
    addSecondaryEmailMutation.mutate({
      email: values.email,
      makePrimary: true,
      redirectTo,
    });
  };

  return (
    <OnboardingLayout userEmail={userEmail}>
      <OnboardingCard
        title={t("set_up_your_organization")}
        subtitle={t("onboarding_org_details_subtitle")}
        footer={
          !submittedEmail ? (
            <div className="flex w-full items-center justify-between gap-4">
              <Button
                color="minimal"
                className="rounded-[10px]"
                onClick={() => {
                  posthog.capture("onboarding_company_email_back_clicked");
                  router.back();
                }}>
                {t("go_back")}
              </Button>
              <Button
                color="primary"
                className="rounded-[10px]"
                type="submit"
                form="company-email-form"
                disabled={addSecondaryEmailMutation.isPending}>
                {t("verify_email")}
              </Button>
            </div>
          ) : undefined
        }>
        {submittedEmail ? (
          <Alert
            severity="info"
            title={t("check_your_email")}
            message={t("org_company_email_verification_sent", { email: submittedEmail })}
          />
        ) : (
          <Form id="company-email-form" form={formMethods} handleSubmit={handleSubmit}>
            <Alert severity="warning" title={t("org_requires_company_email")} className="mb-4" />
            <TextField
              label={t("company_email")}
              placeholder={t("company_email_placeholder")}
              {...formMethods.register("email")}
            />
            {errorMessage && <InputError message={errorMessage} />}
          </Form>
        )}
      </OnboardingCard>

      <OnboardingOrganizationBrowserView avatar={null} name="" bio="" slug="" bannerUrl={null} />
    </OnboardingLayout>
  );
};
