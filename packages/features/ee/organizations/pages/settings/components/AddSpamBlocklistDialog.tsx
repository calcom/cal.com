"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, InputField, TextAreaField } from "@calcom/ui/components/form";
import { RadioGroup } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";

const addSpamEntrySchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});

type AddSpamEntryFormData = z.infer<typeof addSpamEntrySchema>;

interface AddSpamBlocklistDialogProps {
  organizationId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSpamBlocklistDialog({
  organizationId,
  isOpen,
  onClose,
  onSuccess,
}: AddSpamBlocklistDialogProps) {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddSpamEntryFormData>({
    resolver: zodResolver(addSpamEntrySchema),
    defaultValues: {
      type: WatchlistType.EMAIL,
      value: "",
      description: "",
    },
  });

  const createSpamEntryMutation = trpc.viewer.organizations.createSpamBlocklistEntry.useMutation({
    onSuccess: () => {
      showToast(t("spam_entry_added_successfully"), "success");
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      showToast(error.message, "error");
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: AddSpamEntryFormData) => {
    setIsSubmitting(true);
    await createSpamEntryMutation.mutateAsync({
      organizationId,
      ...data,
    });
  };

  const watchedType = form.watch("type");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={t("add_spam_entry")} className="sm:max-w-md">
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    {
                      value: WatchlistType.EMAIL,
                      label: t("email_address"),
                      description: t("block_specific_email"),
                    },
                    {
                      value: WatchlistType.DOMAIN,
                      label: t("domain"),
                      description: t("block_entire_domain"),
                    },
                  ]}
                />
              )}
            />

            <InputField
              label={watchedType === WatchlistType.EMAIL ? t("email_address") : t("domain")}
              placeholder={watchedType === WatchlistType.EMAIL ? "user@example.com" : "@spam-domain.com"}
              {...form.register("value")}
              required
            />

            <TextAreaField
              label={t("description")}
              placeholder={t("optional_reason_for_blocking")}
              {...form.register("description")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("add_spam_entry")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
