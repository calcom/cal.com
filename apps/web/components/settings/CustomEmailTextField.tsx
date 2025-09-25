import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InputError } from "@calcom/ui/components/form";

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
        className={`border-default mt-2 flex h-[40px] w-full items-center rounded-md border ${
          inputFocus ? "ring-brand-default border-neutral-300 ring-2 ring-offset-2" : ""
        }`}>
        <input
          {...formMethods.register(formMethodFieldName)}
          className="flex-1 border-none bg-transparent px-3 py-1.5 text-sm outline-none focus:border-none focus:ring-0"
          data-testid={dataTestId}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
        />
        <div className="flex items-center pr-2">
          {emailPrimary && (
            <Badge variant="default" size="sm" data-testid={`${dataTestId}-primary-badge`}>
              {t("primary")}
            </Badge>
          )}
          {!emailVerified && (
            <Badge
              variant="attention"
              size="sm"
              className="ml-2"
              data-testid={`${dataTestId}-unverified-badge`}>
              {t("unverified")}
            </Badge>
          )}
          <DropdownMenu>
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
              <DropdownMenuItem
                StartIcon="flag"
                color="default"
                className="disabled:opacity-40"
                onClick={handleChangePrimary}
                disabled={!emailVerified || emailPrimary}
                data-testid="secondary-email-make-primary-button">
                {t("make_primary")}
              </DropdownMenuItem>
              {!emailVerified && (
                <DropdownMenuItem
                  StartIcon="send"
                  color="default"
                  className="disabled:opacity-40"
                  onClick={handleVerifyEmail}
                  disabled={emailVerified}
                  data-testid="resend-verify-email-button">
                  {t("resend_email")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                StartIcon="trash"
                color="destructive"
                className="disabled:opacity-40"
                onClick={handleItemDelete}
                disabled={emailPrimary}
                data-testid="secondary-email-delete-button">
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {errorMessage && <InputError message={errorMessage} />}
    </>
  );
};

export default CustomEmailTextField;
