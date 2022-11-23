import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Icon } from "@calcom/ui";

interface IAddVariablesDropdown {
  addVariable: (isEmailSubject: boolean, variable: string) => void;
  isEmailSubject: boolean;
}

const variables = [
  "event_name",
  "event_date",
  "event_time",
  "location",
  "organizer_name",
  "attendee_name",
  "attendee_email",
  "additional_notes",
];

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger className="pt-[6px] focus:bg-gray-50">
        <div className="flex items-center ">
          {t("add_variable")}
          <Icon.FiChevronDown className="ml-1 h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="h-40 overflow-scroll">
        <div className="pt-4 pb-1">
          <div className="mb-2 px-4 text-left text-xs text-gray-500">
            {t("add_dynamic_variables").toLocaleUpperCase()}
          </div>
          {variables.map((variable) => (
            <DropdownMenuItem key={variable} className="hover:ring-0">
              <button
                key={variable}
                type="button"
                className="w-full px-4 py-2"
                onClick={() => props.addVariable(props.isEmailSubject, t(`${variable}_workflow`))}>
                <div className="sm:grid sm:grid-cols-2">
                  <div className="mr-3 text-left md:col-span-1">
                    {`{${t(`${variable}_workflow`).toUpperCase().replace(/ /g, "_")}}`}
                  </div>
                  <div className="hidden text-left text-gray-600 sm:col-span-1 sm:flex">
                    {t(`${variable}_info`)}
                  </div>
                </div>
              </button>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};
