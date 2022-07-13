import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

interface IAddDynamicVariablesDropdown {
  addDynamicVariable: (isEmailSubject: boolean, variable: string) => void;
  disabled: boolean;
  isEmailSubject: boolean;
}

export const AddDynamicVariablesDropdown = (props: IAddDynamicVariablesDropdown) => {
  const { t } = useLocale();
  const dynamicVariables = ["Event name", "Organizer name", "Attendee name", "Event date", "Event time"];

  return (
    <Dropdown>
      <DropdownMenuTrigger
        disabled={props.disabled}
        className="border-1 m-2 rounded-sm border border-gray-300 bg-gray-50 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-100 focus:ring-0">
        <span className="-m-1">+ {t("dynamic_variables")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="h-28 overflow-scroll">
        {dynamicVariables.map((variable, index) => (
          <DropdownMenuItem key={index}>
            <button
              key={index}
              type="button"
              className="px-5 py-1"
              onClick={() => props.addDynamicVariable(props.isEmailSubject, variable)}>
              {variable}
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
