import { zodResolver } from "@hookform/resolvers/zod";
import { startRegistration } from "@simplewebauthn/browser";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { UAParser } from "ua-parser-js";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  Form,
  Input,
  Button,
  showToast,
  Label,
} from "@calcom/ui";

export type CreatePasskeyDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ZCreatePasskeyFormSchema = z.object({
  passkeyName: z.string().min(3),
});

type TCreatePasskeyFormSchema = z.infer<typeof ZCreatePasskeyFormSchema>;

const parser = new UAParser();

const CreatePasskeyDialog = ({ open, setOpen }: CreatePasskeyDialogProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<TCreatePasskeyFormSchema>({
    resolver: zodResolver(ZCreatePasskeyFormSchema),
    defaultValues: {
      passkeyName: "",
    },
  });

  const { mutateAsync: createPasskeyRegistrationOptions } =
    trpc.viewer.passkey.createRegistrationOptions.useMutation();

  const { mutateAsync: createPasskey } = trpc.viewer.passkey.create.useMutation();

  const onFormSubmit = async ({ passkeyName }: TCreatePasskeyFormSchema) => {
    try {
      const passkeyRegistrationOptions = await createPasskeyRegistrationOptions();

      const registrationResult = await startRegistration(passkeyRegistrationOptions);

      await createPasskey({
        passkeyName,
        verificationResponse: registrationResult,
      });

      utils.viewer.passkey.find.invalidate();
      showToast(t("successfully_created_passkey"), "success");
      setOpen(false);
    } catch (err) {
      console.log(err);
      showToast(t("failed_to_create_passkey"), "error");
    }
  };

  const extractDefaultPasskeyName = () => {
    if (!window || !window.navigator) {
      return "";
    }

    parser.setUA(window.navigator.userAgent);

    const result = parser.getResult();
    const operatingSystem = result.os.name;
    const browser = result.browser.name;

    let passkeyName = "";

    if (operatingSystem && browser) {
      passkeyName = `${browser} (${operatingSystem})`;
    }

    return passkeyName;
  };

  useEffect(() => {
    if (!open) {
      const defaultPasskeyName = extractDefaultPasskeyName();

      form.reset({
        passkeyName: defaultPasskeyName,
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title={t("add_passkey")} type="creation">
        <Form form={form} handleSubmit={onFormSubmit}>
          <Label htmlFor="passkey">{t("passkey_name")}</Label>
          <Controller
            name="passkeyName"
            control={form.control}
            render={({ field }) => <Input {...field} />}
          />

          <DialogFooter>
            <DialogClose />
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("add")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePasskeyDialog;
