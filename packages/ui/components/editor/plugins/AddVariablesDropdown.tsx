import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../dropdown";
import { Icon } from "../../icon";

interface IAddVariablesDropdown {
  addVariable: (variable: string) => void;
  isTextEditor?: boolean;
  variables: string[];
  addVariableButtonTop?: boolean;
}

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger aria-label="Add variable" className="focus:bg-muted pt-[6px]">
        <div className="items-center ">
          {props.isTextEditor ? (
            <>
              <div className="hidden sm:flex">
                {t("add_variable")}
                <Icon name="chevron-down" className="ml-1 mt-[2px] h-4 w-4" />
              </div>
              <div className="block sm:hidden">
                {props.addVariableButtonTop ? (
                  <div className="flex">
                    {t("add_variable")}
                    <Icon name="chevron-down" className="ml-1 mt-[2px] h-4 w-4" />
                  </div>
                ) : (
                  "+"
                )}
              </div>
            </>
          ) : (
            <div className="flex">
              {t("add_variable")}
              <Icon name="chevron-down" className="ml-1 mt-[2px] h-4 w-4" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="pb-1 pt-4">
          <div className="text-subtle mb-2 px-4 text-left text-xs">
            {t("add_dynamic_variables").toLocaleUpperCase()}
          </div>
          <div className="h-64 overflow-scroll md:h-80">
            {props.variables.map((variable) => (
              <DropdownMenuItem key={variable} className="hover:ring-0">
                <button
                  key={variable}
                  type="button"
                  className="w-full px-4 py-2"
                  onClick={() => props.addVariable(t(`${variable}_variable`))}>
                  <div className="flex flex-col">
                    <div className="mr-text-left">
                      {`{${t(`${variable}_variable`).toUpperCase().replace(/ /g, "_")}}`}
                    </div>
                    <div className="text-default hidden text-left sm:flex">{t(`${variable}_info`)}</div>
                  </div>
                </button>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};
