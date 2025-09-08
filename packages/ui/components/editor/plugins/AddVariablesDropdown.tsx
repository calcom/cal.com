import { useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

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
  const [query, setQuery] = useState("");

  const filteredVariables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.variables;
    return props.variables.filter((variable) => {
      const key = variable.toLowerCase();
      const name = t(`${variable}_variable`).toLowerCase();
      const info = t(`${variable}_info`).toLowerCase();
      return key.includes(q) || name.includes(q) || info.includes(q);
    });
  }, [props.variables, query, t]);

  return (
    <Dropdown
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}>
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
          <div className="text-subtle mb-3 ml-2 text-left text-xs font-medium uppercase tracking-wide">
            {t("add_dynamic_variables")}
          </div>
          <div className="mb-2 px-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_variables")}
              aria-label={t("search_variables")}
              className="border-subtle bg-default focus:ring-brand-800 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            />
          </div>
          <div className="max-h-64 overflow-y-auto md:max-h-80">
            {filteredVariables.length === 0 ? (
              <div className="text-subtle px-4 py-2 text-center text-sm">{t("no_variables_found")}</div>
            ) : (
              filteredVariables.map((variable) => (
                <DropdownMenuItem key={variable} className="hover:ring-0">
                  <button
                    key={variable}
                    type="button"
                    className="hover:bg-muted w-full rounded-md px-3 py-2 text-left transition-colors"
                    onClick={() => {
                      props.addVariable(t(`${variable}_variable`));
                      setQuery("");
                    }}>
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
              ))
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};
