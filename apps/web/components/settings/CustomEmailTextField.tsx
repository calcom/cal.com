import type { FormValues } from "@pages/settings/my-account/profile";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Badge,
  TextField,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  InputError,
} from "@calcom/ui";

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
  const [inputFocus, setInputFocus] = useState(false);

  return (
    <>
      <div
        className={`border-default mt-2 flex items-center rounded-md border ${
          inputFocus ? "ring-brand-default border-neutral-300 ring-2" : ""
        }`}>
        <TextField
          {...formMethods.register(formMethodFieldName)}
          label=""
          containerClassName="flex flex-1 items-center"
          className="mb-0 border-none outline-none focus:ring-0"
          data-testid={dataTestId}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
        />
        <div className="flex items-center pr-2">
          {emailPrimary && (
            <Badge variant="blue" size="sm" data-testid={`${dataTestId}-primary-badge`}>
              {t("primary")}
            </Badge>
          )}
          {!emailVerified && (
            <Badge variant="orange" size="sm" className="ml-2" data-testid={`${dataTestId}-unverified-badge`}>
              {t("unverified")}
            </Badge>
          )}
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button
                StartIcon="ellipsis"
                variant="icon"
                size="sm"
                color="secondary"
                className="ml-2 rounded-md"
                data-testid="secondary-email-action-group-button"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <DropdownItem
                  StartIcon="flag"
                  color="secondary"
                  className="disabled:opacity-40"
                  onClick={handleChangePrimary}
                  disabled={!emailVerified || emailPrimary}
                  data-testid="secondary-email-make-primary-button">
                  {t("make_primary")}
                </DropdownItem>
              </DropdownMenuItem>
              {!emailVerified && (
                <DropdownMenuItem>
                  <DropdownItem
                    StartIcon="send"
                    color="secondary"
                    className="disabled:opacity-40"
                    onClick={handleVerifyEmail}
                    disabled={emailVerified}
                    data-testid="resend-verify-email-button">
                    {t("resend_email")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <DropdownItem
                  StartIcon="trash"
                  color="destructive"
                  className="disabled:opacity-40"
                  onClick={handleItemDelete}
                  disabled={emailPrimary}
                  data-testid="secondary-email-delete-button">
                  {t("delete")}
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        </div>
      </div>
      {errorMessage && <InputError message={errorMessage} />}
    </>
  );
};

export default CustomEmailTextField;
