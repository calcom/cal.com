import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../dropdown";
import { Icon } from "../../icon";

interface IAddVariablesDropdown {
  addVariable: (variable: string) => void;
  isTextEditor?: boolean;
  variables: string[];
  addVariableButtonTop?: boolean;
  addVariableButtonClassName?: string;
}

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger aria-label="Add variable" className="focus:bg-muted pt-[6px]">
        <div className="items-center">
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
      <DropdownMenuContent className="w-96">
        <div className="p-4">
          <div className="text-subtle mb-3 text-left text-xs font-medium uppercase tracking-wide">
            {t("add_dynamic_variables")}
          </div>
          <div className="max-h-64 overflow-y-auto md:max-h-80">
            {props.variables.map((variable) => (
              <DropdownMenuItem key={variable} className="hover:ring-0">
                <button
                  key={variable}
                  type="button"
                  className="hover:bg-muted w-full rounded-md px-3 py-2 text-left transition-colors"
                  onClick={() => props.addVariable(t(`${variable}_variable`))}>
                  <div className="flex flex-col space-y-1">
                    <div className="text-default font-mono text-sm">
                      {`{${t(`${variable}_variable`).toUpperCase().replace(/ /g, "_")}}`}
                    </div>
                    <div className="text-muted-foreground hidden text-xs sm:block">
                      {t(`${variable}_info`)}
                    </div>
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
