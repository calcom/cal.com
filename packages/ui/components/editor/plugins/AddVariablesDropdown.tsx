import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../form/dropdown";
import { ChevronDown } from "../../icon";

interface IAddVariablesDropdown {
  addVariable: (variable: string) => void;
  isTextEditor?: boolean;
  variables: string[];
}

export const AddVariablesDropdown = (props: IAddVariablesDropdown) => {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger className="focus:bg-muted pt-[6px]">
        <div className="items-center ">
          {props.isTextEditor ? (
            <>
              <div className="hidden sm:flex">
                {t("add_variable")}
                <ChevronDown className="mt-[2px] ml-1 h-4 w-4" />
              </div>
              <div className="block sm:hidden">+</div>
            </>
          ) : (
            <div className="flex">
              {t("add_variable")}
              <ChevronDown className="mt-[2px] ml-1 h-4 w-4" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="pt-4 pb-1">
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
                  <div className="sm:grid sm:grid-cols-2">
                    <div className="mr-3 text-left md:col-span-1">
                      {`{${t(`${variable}_variable`).toUpperCase().replace(/ /g, "_")}}`}
                    </div>
                    <div className="text-default hidden text-left sm:col-span-1 sm:flex">
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
