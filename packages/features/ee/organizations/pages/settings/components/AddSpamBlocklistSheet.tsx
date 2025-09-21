"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WatchlistType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, InputField, TextAreaField } from "@calcom/ui/components/form";
import { RadioGroup, RadioField } from "@calcom/ui/components/radio";
import { Sheet, SheetContent, SheetFooter, SheetHeader } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

const addSpamEntrySchema = z.object({
  type: z.nativeEnum(WatchlistType),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});

type AddSpamEntryFormData = z.infer<typeof addSpamEntrySchema>;

interface AddSpamBlocklistSheetProps {
  organizationId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSpamBlocklistSheet({
  organizationId,
  isOpen,
  onClose,
  onSuccess,
}: AddSpamBlocklistSheetProps) {
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

  const utils = trpc.useUtils();

  const createSpamEntryMutation = trpc.viewer.organizations.createSpamBlocklistEntry.useMutation({
    onSuccess: () => {
      showToast(t("spam_entry_added_successfully"), "success");
      form.reset();
      // Invalidate the spam blocklist query to trigger a refetch in the table
      utils.viewer.organizations.listSpamBlocklist.invalidate();
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <h2 className="text-emphasis text-lg font-semibold leading-6">{t("add_spam_entry")}</h2>
          <p className="text-subtle text-sm">{t("add_spam_entry_description")}</p>
        </SheetHeader>

        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-6 py-6">
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <div>
                  <label className="text-emphasis mb-3 block text-sm font-medium">{t("type")}</label>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <div className="space-y-3">
                      <RadioField
                        id="email"
                        value={WatchlistType.EMAIL}
                        label={
                          <div>
                            <div className="font-medium">{t("email_address")}</div>
                            <div className="text-subtle text-sm">
                              Block a specific email address (e.g., spam@example.com)
                            </div>
                          </div>
                        }
                      />
                      <RadioField
                        id="domain"
                        value={WatchlistType.DOMAIN}
                        label={
                          <div>
                            <div className="font-medium">{t("domain")}</div>
                            <div className="text-subtle text-sm">
                              Block an entire domain (e.g., @spam-site.com)
                            </div>
                          </div>
                        }
                      />
                    </div>
                  </RadioGroup>
                </div>
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

          <SheetFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("add_spam_entry")}
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
