import { useRouter } from "next/router";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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
import { FiPlus } from "@calcom/ui/components/icon";

export interface Option {
  teamId: number | null | undefined; // if undefined, then it's a profile
  label: string | null;
  image?: string | null;
}

interface CreateBtnProps {
  options: Option[];
  createDialog?: () => JSX.Element;
  createFunction?: (teamId?: number) => void;
  subtitle?: string;
  buttonText?: string;
  isLoading?: boolean;
  disableMobileButton?: boolean;
}

export function CreateButton(props: CreateBtnProps) {
  const { t } = useLocale();
  const router = useRouter();

  const CreateDialog = props.createDialog ? props.createDialog() : null;

  const hasTeams = !!props.options.find((option) => option.teamId);

  // inject selection data into url for correct router history
  const openModal = (option: Option) => {
    const query = {
      ...router.query,
      dialog: "new",
      eventPage: option.label,
      teamId: option.teamId,
    };
    if (!option.teamId) {
      delete query.teamId;
    }
    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      {!hasTeams ? (
        <Button
          onClick={() =>
            !!CreateDialog
              ? openModal(props.options[0])
              : props.createFunction
              ? props.createFunction(props.options[0].teamId || undefined)
              : null
          }
          data-testid="new-event-type"
          StartIcon={FiPlus}
          loading={props.isLoading}
          variant={props.disableMobileButton ? "button" : "fab"}>
          {props.buttonText ? props.buttonText : t("new")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              variant={props.disableMobileButton ? "button" : "fab"}
              StartIcon={FiPlus}
              loading={props.isLoading}>
              {props.buttonText ? props.buttonText : t("new")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14} align="end">
            <DropdownMenuLabel>
              <div className="w-48 text-left text-xs">{props.subtitle}</div>
            </DropdownMenuLabel>
            {props.options.map((option) => (
              <DropdownMenuItem key={option.label}>
                <DropdownItem
                  type="button"
                  StartIcon={(props) => (
                    <Avatar
                      alt={option.label || ""}
                      imageSrc={option.image || `${WEBAPP_URL}/${option.label}/avatar.png`} // if no image, use default avatar
                      size="sm"
                      {...props}
                    />
                  )}
                  onClick={() =>
                    !!CreateDialog
                      ? openModal(option)
                      : props.createFunction
                      ? props.createFunction(option.teamId || undefined)
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
      {router.query.dialog === "new" && CreateDialog}
    </>
  );
}
