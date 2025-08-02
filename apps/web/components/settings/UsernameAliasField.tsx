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
import { InputError } from "@calcom/ui/components/form";

import type { FormValues } from "~/settings/my-account/profile-view";

type UsernameAliasFieldProps = {
  formMethods: UseFormReturn<FormValues>;
  formMethodFieldName: `usernameAliases.${number}.username`;
  errorMessage: string;
  dataTestId: string;
  usernamePrimary: boolean;
  handleChangePrimary: () => void;
  handleItemDelete: () => void;
};

const UsernameAliasField = ({
  formMethods,
  formMethodFieldName,
  errorMessage,
  dataTestId,
  usernamePrimary,
  handleChangePrimary,
  handleItemDelete,
}: UsernameAliasFieldProps) => {
  const { t } = useLocale();
  const [inputFocus, setInputFocus] = useState(false);

  return (
    <>
      <div
        className={`border-default mt-2 flex w-full items-center rounded-[10px] border ${
          inputFocus ? "ring-brand-default border-neutral-300 ring-2" : ""
        }`}>
        <input
          {...formMethods.register(formMethodFieldName)}
          className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
          data-testid={dataTestId}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
          readOnly
        />
        <div className="flex items-center pr-2">
          {usernamePrimary && (
            <Badge variant="blue" size="sm" data-testid={`${dataTestId}-primary-badge`}>
              {t("primary")}
            </Badge>
          )}
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button
                StartIcon="ellipsis"
                variant="icon"
                size="xs"
                color="minimal"
                className="ml-2 rounded-md hover:bg-gray-200"
                data-testid="username-alias-action-group-button"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {!usernamePrimary && (
                <DropdownMenuItem>
                  <DropdownItem
                    StartIcon="flag"
                    color="secondary"
                    className="w-full"
                    onClick={handleChangePrimary}
                    data-testid="username-alias-make-primary-button">
                    {t("make_primary")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
              {!usernamePrimary && (
                <DropdownMenuItem>
                  <DropdownItem
                    StartIcon="trash"
                    color="destructive"
                    className="w-full"
                    onClick={handleItemDelete}
                    data-testid="username-alias-delete-button">
                    {t("delete")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </Dropdown>
        </div>
      </div>
      {errorMessage && <InputError message={errorMessage} />}
    </>
  );
};

export default UsernameAliasField;
