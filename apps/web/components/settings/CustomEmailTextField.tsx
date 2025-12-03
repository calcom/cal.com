import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Field, FieldError } from "@coss/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { Icon } from "@calcom/ui/components/icon";

import type { FormValues } from "~/settings/my-account/profile-view";

type CustomEmailTextFieldProps = {
  formMethods: UseFormReturn<FormValues>;
  formMethodFieldName: keyof FormValues;
  errorMessage: string;
  emailVerified: boolean;
  emailPrimary: boolean;
  dataTestId: string;
  handleChangePrimary: () => void;
  handleVerifyEmail: () => void;
  handleItemDelete: () => void;
};

const CustomEmailTextField = ({
  formMethods,
  formMethodFieldName,
  errorMessage,
  emailVerified,
  emailPrimary,
  dataTestId,
  handleChangePrimary,
  handleVerifyEmail,
  handleItemDelete,
}: CustomEmailTextFieldProps) => {
  const { t } = useLocale();

  return (
    <Field>
      <InputGroup>
        <InputGroupInput
          {...formMethods.register(formMethodFieldName)}
          type="email"
          data-testid={dataTestId}
          aria-invalid={!!errorMessage || undefined}
        />
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
                (props) => (
                  <Button 
                    {...props}
                    aria-label="Open menu" 
                    size="icon-xs" 
                    variant="ghost" 
                    data-testid="secondary-email-action-group-button">
                    <Icon name="ellipsis" />
                  </Button>
                )
              }
            />
            <MenuPopup align="end" sideOffset={8}>
              <MenuItem
                disabled={!emailVerified || emailPrimary}
                onClick={handleChangePrimary}
                data-testid="secondary-email-make-primary-button">
                {t("make_primary")}
              </MenuItem>
              {!emailVerified && (
                <MenuItem
                  disabled={emailVerified}
                  onClick={handleVerifyEmail}
                  data-testid="resend-verify-email-button">
                  {t("resend_email")}
                </MenuItem>
              )}
              <MenuItem
                variant="destructive"
                disabled={emailPrimary}
                onClick={handleItemDelete}
                data-testid="secondary-email-delete-button">
                {t("delete")}
              </MenuItem>
            </MenuPopup>
          </Menu>
        </InputGroupAddon>
      </InputGroup>
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </Field>
  );
};

export default CustomEmailTextField;
