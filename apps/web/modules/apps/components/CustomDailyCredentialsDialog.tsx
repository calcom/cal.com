"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const customDailyCredentialsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

type CustomDailyCredentialsFormValues = z.infer<typeof customDailyCredentialsSchema>;

interface CustomDailyCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomDailyCredentialsDialog({ open, onOpenChange }: CustomDailyCredentialsDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: customCredentials, isPending: isLoadingCredentials } =
    trpc.viewer.calVideo.getCustomDailyCredentials.useQuery(undefined, {
      enabled: open,
    });

  const setCustomCredentialsMutation = trpc.viewer.calVideo.setCustomDailyCredentials.useMutation({
    onSuccess: () => {
      showToast(t("custom_daily_credentials_saved"), "success");
      utils.viewer.calVideo.getCustomDailyCredentials.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const removeCustomCredentialsMutation = trpc.viewer.calVideo.removeCustomDailyCredentials.useMutation({
    onSuccess: () => {
      showToast(t("custom_daily_credentials_removed"), "success");
      utils.viewer.calVideo.getCustomDailyCredentials.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const form = useForm<CustomDailyCredentialsFormValues>({
    resolver: zodResolver(customDailyCredentialsSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const handleSubmit = (values: CustomDailyCredentialsFormValues) => {
    setCustomCredentialsMutation.mutate({ apiKey: values.apiKey });
  };

  const handleRemove = () => {
    setIsRemoving(true);
    removeCustomCredentialsMutation.mutate(undefined, {
      onSettled: () => setIsRemoving(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("use_your_own_daily_credentials")}
        description={t("use_your_own_daily_credentials_description")}
        type="creation"
        Icon="key">
        <Form form={form} handleSubmit={handleSubmit}>
          <div className="space-y-4">
            {customCredentials?.hasCustomCredentials && (
              <div className="bg-subtle rounded-md p-3">
                <p className="text-subtle text-sm">
                  {t("current_api_key")}: <span className="font-mono">{customCredentials.apiKey}</span>
                </p>
              </div>
            )}
            <TextField
              type="password"
              required
              {...form.register("apiKey")}
              placeholder={t("enter_daily_api_key")}
              label={t("daily_api_key")}
            />
            <p className="text-subtle text-xs">
              {t("daily_api_key_help")}{" "}
              <a
                href="https://dashboard.daily.co/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emphasis underline">
                dashboard.daily.co
              </a>
            </p>
          </div>

          <DialogFooter showDivider className="mt-8">
            <div className="flex w-full justify-between">
              <div>
                {customCredentials?.hasCustomCredentials && (
                  <Button
                    type="button"
                    color="destructive"
                    onClick={handleRemove}
                    loading={isRemoving}
                    disabled={setCustomCredentialsMutation.isPending}>
                    {t("remove")}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <DialogClose />
                <Button
                  color="primary"
                  type="submit"
                  loading={setCustomCredentialsMutation.isPending}
                  disabled={isRemoving}>
                  {t("save")}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
