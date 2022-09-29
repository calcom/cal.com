import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";
import { Label } from "@calcom/ui/v2";
import {
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";

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
  "additional_notes",
];

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger className="focus:bg-transparent focus:ring-transparent focus:ring-offset-0 ">
        <Label className="mb-0">
          <div className="flex items-center">
            {t("add_variable")}
            <Icon.FiChevronDown className="ml-1 h-4 w-4" />
          </div>
        </Label>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="h-40 overflow-scroll">
        <div className="p-3">
          <div className="mb-2 text-xs text-gray-500">{t("add_dynamic_variables").toLocaleUpperCase()}</div>
          {variables.map((variable) => (
            <DropdownMenuItem key={variable}>
              <button
                key={variable}
                type="button"
                className="w-full py-2"
                onClick={() => props.addVariable(props.isEmailSubject, t(`${variable}_workflow`))}>
                <div className="md:grid md:grid-cols-2">
                  <div className="mr-3 text-left md:col-span-1">
                    {`{${t(`${variable}_workflow`).toUpperCase().replace(/ /g, "_")}}`}
                  </div>
                  <div className="invisible text-left text-gray-600 md:visible md:col-span-1">
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
