import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Form } from "@calid/features/ui/components/form";
import { InputError } from "@calid/features/ui/components/input/hint-or-errors";
import { TextField } from "@calid/features/ui/components/input/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";

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
    // We will reset the errorMessage once the user starts modifying the email
    const subscription = formMethods.watch(() => clearErrorMessage());
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add_email")}</DialogTitle>
          <DialogDescription>{t("add_email_description")}</DialogDescription>
        </DialogHeader>
        <Form form={formMethods} onSubmit={handleAddEmail}>
          <div className="text-subtle mb-4 text-sm">{t("change_email_hint")}</div>
          <TextField
            label={t("email_address")}
            data-testid="secondary-email-input"
            {...formMethods.register("email")}
          />
          {errorMessage && <InputError message={errorMessage} />}
          <DialogFooter className="mt-10">
            <Button color="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
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
