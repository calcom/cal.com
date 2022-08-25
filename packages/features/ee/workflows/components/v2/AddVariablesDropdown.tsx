import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

interface IAddVariablesDropdown {
  addVariable: (isEmailSubject: boolean, variable: string) => void;
  isEmailSubject: boolean;
}

const variables = [
  "event_name",
  "organizer_name",
  "attendee_name",
  "event_date",
  "event_time",
  "location",
  "additional_notes",
];

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger className="border-1 m-2 rounded-md border border-gray-300 bg-gray-50 text-xs hover:border-gray-400 hover:bg-gray-100 focus:ring-0">
        <span className="-m-1">+ {t("variable")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="ml-10 h-40 overflow-scroll">
        {variables.map((variable) => (
          <DropdownMenuItem key={variable}>
            <button
              key={variable}
              type="button"
              className="px-5 py-1"
              onClick={() => props.addVariable(props.isEmailSubject, t(`${variable}_workflow`))}>
              {t(`${variable}_workflow`)}
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
