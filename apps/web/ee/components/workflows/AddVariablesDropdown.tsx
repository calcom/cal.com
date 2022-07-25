import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

interface IAddVariablesDropdown {
  addVariable: (isEmailSubject: boolean, variable: string) => void;
  disabled: boolean;
  isEmailSubject: boolean;
}

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();
  const variables = [
    t("event_name_dynamic_var"),
    t("organizer_name"),
    t("attendee_name_dynamic_var"),
    t("event_date"),
    t("event_time"),
    t("location"),
  ];

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
      <DropdownMenuContent className="h-28 overflow-scroll">
        {variables.map((variable, index) => (
          <DropdownMenuItem key={index}>
            <button
              key={index}
              type="button"
              className="px-5 py-1"
              onClick={() => props.addVariable(props.isEmailSubject, variable)}>
              {variable}
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
