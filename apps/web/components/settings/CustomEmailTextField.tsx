import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { InputError, Input } from "@calcom/ui/components/form";

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
  const [inputFocus, setInputFocus] = useState(false);

  return (
    <>
      <div
        className={`mt-2 flex w-full items-center rounded-[10px] border transition-all ${
          inputFocus
            ? "border-emphasis shadow-outline-gray-focused"
            : "border-default hover:border-emphasis shadow-outline-gray-rested"
        }`}>
        <Input
          {...formMethods.register(formMethodFieldName)}
          className="ring-0 focus:ring-0 focus:shadow-none! flex-1 border-none bg-transparent px-3 py-1.5 text-sm outline-none"
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
                size="xs"
                color="minimal"
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
                  className="rounded-t-none disabled:opacity-40"
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
