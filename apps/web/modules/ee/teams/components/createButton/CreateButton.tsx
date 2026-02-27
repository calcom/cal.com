"use client";

import { usePathname, useRouter } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import type { ButtonColor } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon/icon-names";

export interface Option {
  platform?: boolean;
  teamId: number | null | undefined; // if undefined, then it's a profile
  label: string | null;
  image: string | null;
  slug: string | null;
}

export interface AdditionalMenuItem {
  label: string;
  icon?: IconName;
  onClick: () => void;
}

export type CreateBtnProps = {
  options: Option[];
  createDialog?: () => JSX.Element;
  createFunction?: (teamId?: number, platform?: boolean) => void;
  subtitle?: string;
  buttonText?: string;
  isPending?: boolean;
  disableMobileButton?: boolean;
  "data-testid"?: string;
  color?: ButtonColor;
  className?: string;
  additionalMenuItems?: AdditionalMenuItem[];
};

/**
 * @deprecated use CreateButtonWithTeamsList instead
 */
export function CreateButton(props: CreateBtnProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();

  const {
    createDialog,
    options,
    isPending,
    createFunction,
    buttonText,
    disableMobileButton,
    subtitle,
    className,
    additionalMenuItems,
    ...restProps
  } = props;
  const CreateDialog = createDialog ? createDialog() : null;

  const hasTeams = !!options.find((option) => option.teamId);
  const platform = !!options.find((option) => option.platform);
  const hasAdditionalItems = additionalMenuItems && additionalMenuItems.length > 0;
  const hasMultipleOptions = options.length > 1;
  const showDropdown = hasTeams || platform || hasAdditionalItems;
  const isFabVariant = !disableMobileButton;
  // On FAB variant, EndIcon shows as "plus" on mobile, so we remove StartIcon to avoid duplicate
  // On button variant, both icons work correctly
  const startIcon = isFabVariant && (hasMultipleOptions || showDropdown) ? undefined : "plus";
  const endIcon = hasMultipleOptions || showDropdown ? "chevron-down" : undefined;

  // inject selection data into url for correct router history
  const openModal = (option: Option) => {
    const _searchParams = new URLSearchParams(searchParams.toString());
    function setParamsIfDefined(key: string, value: string | number | boolean | null | undefined) {
      if (value !== undefined && value !== null) _searchParams.set(key, value.toString());
    }
    setParamsIfDefined("dialog", "new");
    setParamsIfDefined("eventPage", option.slug);
    setParamsIfDefined("teamId", option.teamId);
    if (!option.teamId) {
      _searchParams.delete("teamId");
    }
    router.push(`${pathname}?${_searchParams.toString()}`);
  };

  return (
    <>
      {!showDropdown ? (
        <Button
          onClick={() =>
            CreateDialog
              ? openModal(options[0])
              : createFunction
                ? createFunction(options[0].teamId || undefined)
                : null
          }
          data-testid="create-button"
          StartIcon={startIcon}
          EndIcon={endIcon}
          size="sm"
          loading={isPending}
          variant={disableMobileButton ? "button" : "fab"}
          className={classNames(disableMobileButton && "md:min-h-min md:min-w-min", className)}
          {...restProps}>
          {buttonText ? buttonText : t("new")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              variant={disableMobileButton ? "button" : "fab"}
              StartIcon={startIcon}
              EndIcon={endIcon}
              size="sm"
              data-testid="create-button-dropdown"
              loading={isPending}
              className={classNames(disableMobileButton && "md:min-h-min md:min-w-min", className)}
              {...restProps}>
              {buttonText ? buttonText : t("new")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14} align="end" className="scroll-bar max-h-60 overflow-y-auto">
            <DropdownMenuLabel>
              <div className="w-48 text-left text-xs">{subtitle}</div>
            </DropdownMenuLabel>
            {options.map((option, idx) => (
              <DropdownMenuItem key={option.label}>
                <DropdownItem
                  type="button"
                  data-testid={`option${option.teamId ? "-team" : ""}-${idx}`}
                  CustomStartIcon={<Avatar alt={option.label || ""} imageSrc={option.image} size="sm" />}
                  onClick={() =>
                    CreateDialog
                      ? openModal(option)
                      : createFunction
                        ? createFunction(option.teamId || undefined, option.platform)
                        : null
                  }>
                  {" "}
                  {/*improve this code */}
                  <span>{option.label}</span>
                </DropdownItem>
              </DropdownMenuItem>
            ))}
            {hasAdditionalItems && (
              <>
                <DropdownMenuSeparator />
                {additionalMenuItems?.map((item, idx) => (
                  <DropdownMenuItem key={`additional-${idx}`}>
                    <DropdownItem
                      type="button"
                      CustomStartIcon={
                        <span className="inline-flex h-6 w-6 min-h-6 min-w-6 items-center justify-center">
                          {item.icon && <Icon name={item.icon} className="h-4 w-4" />}
                        </span>
                      }
                      onClick={item.onClick}>
                      <span>{item.label}</span>
                    </DropdownItem>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </Dropdown>
      )}
      {searchParams?.get("dialog") === "new" && CreateDialog}
    </>
  );
}
