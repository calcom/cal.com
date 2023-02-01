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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui";
import { FiPlus } from "@calcom/ui/components/icon";

export interface Parent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

interface CreateBtnProps {
  // set true for use on the team settings page
  canAdd: boolean;
  // set true when in use on the team settings page
  isIndividualTeam?: boolean;
  // EventTypeParent can be a profile (as first option) or a team for the rest.
  options: Parent[];

  createDialog?: () => JSX.Element;
  dublicateDialog?: () => JSX.Element;
  createFunction?: (teamId?: number) => void;
  subtitle?: string;
  className?: string;
  buttonText?: string;
}

export function CreateButton(props: CreateBtnProps) {
  const { t } = useLocale();
  const router = useRouter();

  const CreateDialog = props.createDialog ? props.createDialog() : null;
  const DublicateDialog = props.dublicateDialog ? props.dublicateDialog() : null;

  const hasTeams = !!props.options.find((option) => option.teamId);

  // inject selection data into url for correct router history
  const openModal = (option: Parent) => {
    const query = {
      ...router.query,
      dialog: "new",
      eventPage: option.slug,
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
      {!hasTeams || props.isIndividualTeam ? (
        <Button
          onClick={() => openModal(props.options[0])}
          data-testid="new-event-type"
          StartIcon={FiPlus}
          variant="fab"
          disabled={!props.canAdd}
          className={props.className}>
          {props.buttonText ? props.buttonText : t("new")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button variant="fab" StartIcon={FiPlus} className={props.className}>
              {props.buttonText ? props.buttonText : t("new")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14} align="end">
            <DropdownMenuLabel>
              <div className="w-48">{props.subtitle}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {props.options.map((option) => (
              <DropdownMenuItem key={option.slug}>
                <DropdownItem
                  type="button"
                  StartIcon={(props: any) => (
                    <Avatar
                      alt={option.name || ""}
                      imageSrc={option.image || `${WEBAPP_URL}/${option.slug}/avatar.png`} // if no image, use default avatar
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
                  <span>{option.name ? option.name : option.slug}</span>
                </DropdownItem>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
      {router.query.dialog === "duplicate" && DublicateDialog}
      {router.query.dialog === "new" && CreateDialog}
    </>
  );
}
