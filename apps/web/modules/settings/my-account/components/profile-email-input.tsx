import { useLocale } from "@calcom/i18n/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Field, FieldError } from "@coss/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { EllipsisIcon, FlagIcon, SendIcon, TrashIcon } from "@coss/ui/icons";
import type { UseFormRegisterReturn } from "react-hook-form";

export type ProfileEmailInputProps = {
  registration: UseFormRegisterReturn;
  errorMessage?: string;
  emailVerified: boolean;
  emailPrimary: boolean;
  dataTestId: string;
  onMakePrimary: () => void;
  onResendVerification: () => void;
  onDelete: () => void;
};

export function ProfileEmailInput({
  registration,
  errorMessage,
  emailVerified,
  emailPrimary,
  dataTestId,
  onMakePrimary,
  onResendVerification,
  onDelete,
}: ProfileEmailInputProps) {
  const { t } = useLocale();

  return (
    <Field className="contents" invalid={!!errorMessage}>
      <InputGroup>
        <InputGroupInput {...registration} type="email" data-testid={dataTestId} />
        <InputGroupAddon align="inline-end">
          {emailPrimary && (
            <Badge variant="info" data-testid={`${dataTestId}-primary-badge`}>
              {t("primary")}
            </Badge>
          )}
          {!emailVerified && (
            <Badge variant="warning" data-testid={`${dataTestId}-unverified-badge`}>
              {t("unverified")}
            </Badge>
          )}
          <Menu>
            <MenuTrigger
              render={
                <Button
                  aria-label={t("email_options")}
                  size="icon-xs"
                  variant="ghost"
                  data-testid="secondary-email-action-group-button"
                />
              }>
              <EllipsisIcon aria-hidden="true" />
            </MenuTrigger>
            <MenuPopup align="end" alignOffset={-4} sideOffset={8}>
              <MenuItem
                disabled={!emailVerified || emailPrimary}
                onClick={onMakePrimary}
                data-testid="secondary-email-make-primary-button">
                <FlagIcon aria-hidden="true" />
                {t("make_primary")}
              </MenuItem>
              {!emailVerified && (
                <MenuItem
                  disabled={emailVerified}
                  onClick={onResendVerification}
                  data-testid="resend-verify-email-button">
                  <SendIcon aria-hidden="true" />
                  {t("resend_email")}
                </MenuItem>
              )}
              <MenuItem
                disabled={emailPrimary}
                variant="destructive"
                onClick={onDelete}
                data-testid="secondary-email-delete-button">
                <TrashIcon aria-hidden="true" />
                {t("delete")}
              </MenuItem>
            </MenuPopup>
          </Menu>
        </InputGroupAddon>
      </InputGroup>
      {errorMessage && <FieldError match>{errorMessage}</FieldError>}
    </Field>
  );
}
