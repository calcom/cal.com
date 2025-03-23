import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  Button,
  TextField,
  Form,
  InputError,
} from "@calcom/ui";

interface SecondaryEmailModalProps {
  isLoading: boolean;
  errorMessage?: string;
  handleAddEmail: (value: { email: string }) => void;
  onCancel: () => void;
  clearErrorMessage: () => void;
}

const SecondaryEmailModal = ({
  isLoading,
  errorMessage,
  handleAddEmail,
  onCancel,
  clearErrorMessage,
}: SecondaryEmailModalProps) => {
  const { t } = useLocale();
  type FormValues = {
    email: string;
  };

  const formMethods = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        email: emailSchema,
      })
    ),
  });

  useEffect(() => {
    // Reset error message when user modifies input
    const subscription = formMethods.watch(() => clearErrorMessage());
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("add_email")}
        description={t("add_email_description")}
        type="creation"
        data-testid="secondary-email-add-dialog">
        <Form form={formMethods} handleSubmit={handleAddEmail}>
          <div className="text-subtle mb-4 text-sm">{t("change_email_hint")}</div>
          
          <div className="flex items-start space-x-4">
            {/* Text Area */}
            <TextField
              label={t("email_address")}
              data-testid="secondary-email-input"
              {...formMethods.register("email")}
              className="h-40 w-full resize-none"
            />

            {/* Formatting Options */}
            <div className="flex flex-col space-y-2">
              <button className="px-2 py-1 text-sm font-bold bg-gray-200 rounded">B</button>
              <button className="px-2 py-1 text-sm font-bold bg-gray-200 rounded">I</button>
              <button className="px-2 py-1 text-sm font-bold bg-gray-200 rounded">&lt;/&gt;</button>
            </div>
          </div>

          {errorMessage && <InputError message={errorMessage} />}

          <DialogFooter showDivider className="mt-10">
            <DialogClose onClick={onCancel}>{t("cancel")}</DialogClose>
            <Button type="submit" data-testid="add-secondary-email-button" disabled={isLoading}>
              {t("add_email")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SecondaryEmailModal;

