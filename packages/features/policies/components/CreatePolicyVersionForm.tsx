"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PolicyType } from "@calcom/prisma/enums";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const createPolicySchema = z.object({
  type: z.nativeEnum(PolicyType),
  description: z.string().min(1, "Description for US users is required"),
  descriptionNonUS: z.string().min(1, "Description for non-US users is required"),
});

type CreatePolicyFormValues = z.infer<typeof createPolicySchema>;

export function CreatePolicyVersionForm() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<CreatePolicyFormValues>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      type: PolicyType.PRIVACY_POLICY,
      description: "",
      descriptionNonUS: "",
    },
  });

  const createMutation = trpc.viewer.admin.policy.create.useMutation({
    onSuccess: () => {
      showToast(t("policy_version_created_successfully"), "success");
      form.reset({
        type: PolicyType.PRIVACY_POLICY,
        description: "",
        descriptionNonUS: "",
      });
      setIsOpen(false);
      // Invalidate both the admin list and the /me query so users see the modal immediately
      utils.viewer.admin.policy.list.invalidate();
      utils.viewer.me.get.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: CreatePolicyFormValues) => {
    createMutation.mutate({
      type: data.type,
      description: data.description,
      descriptionNonUS: data.descriptionNonUS,
    });
  };

  if (!isOpen) {
    return (
      <div className="border-subtle rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-emphasis text-lg font-semibold">{t("create_new_policy_version")}</h3>
            <p className="text-subtle text-sm">{t("create_new_policy_version_description")}</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("create_policy_version")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-subtle rounded-md border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-emphasis text-lg font-semibold">{t("create_new_policy_version")}</h3>
        <Button color="minimal" onClick={() => setIsOpen(false)}>
          {t("cancel")}
        </Button>
      </div>

      <Form form={form} handleSubmit={onSubmit}>
        <div className="space-y-4">
          <div>
            <label className="text-default mb-2 block text-sm font-medium">{t("policy_type")}</label>
            <select
              {...form.register("type")}
              className="border-default bg-default text-emphasis focus:border-emphasis focus:ring-emphasis block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2">
              <option value={PolicyType.PRIVACY_POLICY}>{t("privacy_policy")}</option>
            </select>
          </div>

          <TextAreaField
            label={t("description_us")}
            placeholder={t("policy_description_us_placeholder")}
            {...form.register("description")}
            rows={3}
            required
          />

          <TextAreaField
            label={t("description_non_us")}
            placeholder={t("policy_description_non_us_placeholder")}
            {...form.register("descriptionNonUS")}
            rows={3}
            required
          />

          <div className="flex justify-end space-x-2">
            <Button color="secondary" onClick={() => setIsOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              {t("create_policy_version")}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
