import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, DialogFooter, DialogClose, Button, TextField, Form } from "@calcom/ui";

interface SecondaryEmailModalProps {
  isLoading: boolean;
  handleAddEmail: (value: { email: string }) => void;
  onCancel: () => void;
}

const SecondaryEmailModal = ({ isLoading, handleAddEmail, onCancel }: SecondaryEmailModalProps) => {
  const { t } = useLocale();
  type FormValues = {
    email: string;
  };
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        email: z.string().email(),
      })
    ),
  });

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("add_email")}
        description={t("add_email_description")}
        type="creation"
        data-testId="secondary-email-add-dialog">
        <Form form={formMethods} handleSubmit={handleAddEmail}>
          <TextField
            label={t("email_address")}
            data-testId="secondary-email-input"
            {...formMethods.register("email")}
          />
          <DialogFooter showDivider className="mt-10">
            <DialogClose onClick={onCancel}>{t("cancel")}</DialogClose>
            <Button type="submit" data-testId="add-secondary-email-button" disabled={isLoading}>
              {t("add_email")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SecondaryEmailModal;
