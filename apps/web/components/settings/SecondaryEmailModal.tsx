import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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
    const subscription = formMethods.watch(() => clearErrorMessage());
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogPopup data-testid="secondary-email-add-dialog">
        <DialogHeader>
          <DialogTitle>{t("add_email")}</DialogTitle>
          <DialogDescription>{t("add_email_description")}</DialogDescription>
        </DialogHeader>
        <Form className="contents" onSubmit={formMethods.handleSubmit(handleAddEmail)}>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">{t("change_email_hint")}</p>
              <Controller
                name="email"
                control={formMethods.control}
                render={({
                  field: { ref, name, value, onBlur, onChange },
                  fieldState: { invalid, error },
                }) => (
                  <Field name={name} invalid={invalid || !!errorMessage}>
                    <FieldLabel>{t("email_address")}</FieldLabel>
                    <Input
                      id={name}
                      ref={ref}
                      name={name}
                      type="email"
                      value={value ?? ""}
                      onBlur={onBlur}
                      onChange={(e) => onChange(e.target.value)}
                      data-testid="secondary-email-input"
                    />
                    <FieldError match={!!error}>{error?.message}</FieldError>
                    {errorMessage && <FieldError match>{errorMessage}</FieldError>}
                  </Field>
                )}
              />
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />} onClick={onCancel}>
              {t("cancel")}
            </DialogClose>
            <Button
              type="submit"
              data-testid="add-secondary-email-button"
              loading={isLoading}>
              {t("add_email")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
};

export default SecondaryEmailModal;
