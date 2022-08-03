import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

interface IAddVariablesDropdown {
  addVariable: (isEmailSubject: boolean, variable: string) => void;
  disabled: boolean;
  isEmailSubject: boolean;
}

const variables = [
  "event_name_workflow",
  "organizer_name_workflow",
  "attendee_name_workflow",
  "event_date_workflow",
  "event_time_workflow",
  "location_workflow",
  "additional_notes_workflow",
];

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger
        disabled={props.disabled}
        className={classNames(
          "border-1 m-2 rounded-sm border border-gray-300 bg-gray-50 text-xs hover:border-gray-400 hover:bg-gray-100 focus:ring-0",
          props.disabled ? "text-gray-300" : "text-gray-600"
        )}>
        <span className="-m-1">+ {t("variable")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="h-40 overflow-scroll">
        {variables.map((variable) => (
          <DropdownMenuItem key={variable}>
            <button
              key={variable}
              type="button"
              className="px-5 py-1"
              onClick={() => props.addVariable(props.isEmailSubject, variable)}>
              {t(variable)}
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
