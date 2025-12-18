"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PolicyType } from "@calcom/prisma/enums";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Form, TextAreaField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const createPolicySchema = z.object({
  type: z.nativeEnum(PolicyType),
  description: z.string().min(1, "Description for US users is required"),
  descriptionNonUS: z.string().min(1, "Description for non-US users is required"),
});

type CreatePolicyFormValues = z.infer<typeof createPolicySchema>;

const POLICY_TYPE_OPTIONS = [{ label: "Privacy Policy", value: PolicyType.PRIVACY_POLICY }];

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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  };

  return (
    <>
      <div className="border-subtle rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-emphasis text-lg font-semibold">{t("create_new_policy_version")}</h3>
            <p className="text-subtle text-sm">{t("create_new_policy_version_description")}</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>{t("create_policy_version")}</Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          title={t("create_new_policy_version")}
          description={t("create_new_policy_version_description")}>
          <Form form={form} handleSubmit={onSubmit}>
            <div className="space-y-4">
              <SelectField
                label={t("policy_type")}
                options={POLICY_TYPE_OPTIONS}
                value={POLICY_TYPE_OPTIONS.find((opt) => opt.value === form.watch("type"))}
                onChange={(option) => {
                  if (option) {
                    form.setValue("type", option.value);
                  }
                }}
              />

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
            </div>

            <DialogFooter>
              <DialogClose />
              <Button type="submit" loading={createMutation.isPending}>
                {t("create_policy_version")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
