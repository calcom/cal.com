import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { isPasswordValid } from "@calcom/features/auth/lib/isPasswordValid";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, Form, PasswordField } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

const querySchema = z.object({
  id: z.string(),
});

const formSchema = z.object({
  password: z.string().superRefine((data, ctx) => {
    const isStrict = true;
    const result = isPasswordValid(data, true, isStrict);
    Object.keys(result).map((key: string) => {
      if (!result[key as keyof typeof result]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: key,
        });
      }
    });
  }),
});

export const SetPasswordForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const { id: orgId } = querySchema.parse(routerQuery);

  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  const setPasswordFormMethods = useForm<{
    password: string;
  }>({
    resolver: zodResolver(formSchema),
  });

  const setPasswordMutation = trpc.viewer.organizations.setPassword.useMutation({
    onSuccess: (data) => {
      if (data.update) {
        router.push(`/settings/organizations/${orgId}/about`);
      }
    },
    onError: (err) => {
      setServerErrorMessage(err.message);
    },
  });

  return (
    <>
      <Form
        form={setPasswordFormMethods}
        handleSubmit={(v) => {
          if (!setPasswordMutation.isLoading) {
            setServerErrorMessage(null);
            setPasswordMutation.mutate({ newPassword: v.password });
          }
        }}>
        <div>
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}
        </div>

        <div className="mb-5">
          <Controller
            name="password"
            control={setPasswordFormMethods.control}
            render={({ field: { onBlur, onChange, value } }) => (
              <PasswordField
                value={value || ""}
                onBlur={onBlur}
                onChange={async (e) => {
                  onChange(e.target.value);
                  setPasswordFormMethods.setValue("password", e.target.value);
                  await setPasswordFormMethods.trigger("password");
                }}
                hintErrors={["caplow", "admin_min", "num"]}
                name="password"
                autoComplete="off"
              />
            )}
          />
        </div>

        <div className="flex">
          <Button
            disabled={setPasswordFormMethods.formState.isSubmitting || setPasswordMutation.isLoading}
            color="primary"
            EndIcon={ArrowRight}
            type="submit"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};
