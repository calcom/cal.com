import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Form, TextField, InputError } from "@calcom/ui/components/form";

interface UsernameAliasModalProps {
  isLoading: boolean;
  errorMessage?: string;
  handleAddUsernameAlias: (value: { username: string }) => void;
  onCancel: () => void;
  clearErrorMessage: () => void;
}

const UsernameAliasModal = ({
  isLoading,
  errorMessage,
  handleAddUsernameAlias,
  onCancel,
  clearErrorMessage,
}: UsernameAliasModalProps) => {
  const { t } = useLocale();
  type FormValues = {
    username: string;
  };
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        username: z.string().min(1, t("username_required")),
      })
    ),
  });

  useEffect(() => {
    // We will reset the errorMessage once the user starts modifying the username
    const subscription = formMethods.watch(() => clearErrorMessage());
    return () => subscription.unsubscribe();
  }, [formMethods.watch]);

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("add_username_alias")}
        description={t("add_username_alias_description")}
        type="creation"
        data-testid="username-alias-add-dialog">
        <Form form={formMethods} handleSubmit={handleAddUsernameAlias}>
          <div className="text-subtle mb-4 text-sm">{t("username_alias_hint")}</div>
          <TextField
            label={t("username_alias")}
            data-testid="username-alias-input"
            {...formMethods.register("username")}
          />
          {errorMessage && <InputError message={errorMessage} />}
          <DialogFooter showDivider className="mt-10">
            <DialogClose onClick={onCancel}>{t("cancel")}</DialogClose>
            <Button type="submit" data-testid="add-username-alias-button" disabled={isLoading}>
              {t("add_username_alias")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameAliasModal;
