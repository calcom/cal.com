import { usePathname, useRouter } from "next/navigation";

import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonColor } from "@calcom/ui";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

export interface Option {
  teamId: number | null | undefined; // if undefined, then it's a profile
  label: string | null;
  image?: string | null;
  slug: string | null;
}

export type CreateBtnProps = {
  options: Option[];
  createDialog?: () => JSX.Element;
  createFunction?: (teamId?: number) => void;
  subtitle?: string;
  buttonText?: string;
  isLoading?: boolean;
  disableMobileButton?: boolean;
  "data-testid"?: string;
  color?: ButtonColor;
};

/**
 * @deprecated use CreateButtonWithTeamsList instead
 */
export function CreateButton(props: CreateBtnProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const bookerUrl = useBookerUrl();

  const {
    createDialog,
    options,
    isLoading,
    createFunction,
    buttonText,
    disableMobileButton,
    subtitle,
    ...restProps
  } = props;
  const CreateDialog = createDialog ? createDialog() : null;

  const hasTeams = !!options.find((option) => option.teamId);

  // inject selection data into url for correct router history
  const openModal = (option: Option) => {
    const _searchParams = new URLSearchParams(searchParams ?? undefined);
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
      {!hasTeams ? (
        <Button
          onClick={() =>
            !!CreateDialog
              ? openModal(options[0])
              : createFunction
              ? createFunction(options[0].teamId || undefined)
              : null
          }
          data-testid="create-button"
          StartIcon={Plus}
          loading={isLoading}
          variant={disableMobileButton ? "button" : "fab"}
          {...restProps}>
          {buttonText ? buttonText : t("new")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              variant={disableMobileButton ? "button" : "fab"}
              StartIcon={Plus}
              data-testid="create-button-dropdown"
              loading={isLoading}
              {...restProps}>
              {buttonText ? buttonText : t("new")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14} align="end">
            <DropdownMenuLabel>
              <div className="w-48 text-left text-xs">{subtitle}</div>
            </DropdownMenuLabel>
            {options.map((option, idx) => (
              <DropdownMenuItem key={option.label}>
                <DropdownItem
                  type="button"
                  data-testid={`option${option.teamId ? "-team" : ""}-${idx}`}
                  StartIcon={(props) => (
                    <Avatar
                      alt={option.label || ""}
                      imageSrc={option.image || `${bookerUrl}/${option.label}/avatar.png`} // if no image, use default avatar
                      size="sm"
                      {...props}
                    />
                  )}
                  onClick={() =>
                    !!CreateDialog
                      ? openModal(option)
                      : createFunction
                      ? createFunction(option.teamId || undefined)
                      : null
                  }>
                  {" "}
                  {/*improve this code */}
                  <span>{option.label}</span>
                </DropdownItem>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
      {searchParams?.get("dialog") === "new" && CreateDialog}
    </>
  );
}
