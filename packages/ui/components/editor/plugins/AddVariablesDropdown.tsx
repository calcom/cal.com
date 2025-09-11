import { useMemo, useState, useRef, useEffect } from "react";

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

  const [isOpen, setisOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedIndex >= 0 && dropdownContainerRef.current && itemRefs.current[selectedIndex]) {
      const container = dropdownContainerRef.current;
      const selectedItem = itemRefs.current[selectedIndex];

      if (selectedItem) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();

        if (itemRect.bottom > containerRect.bottom) {
          container.scrollTop += itemRect.bottom - containerRect.bottom;
        } else if (itemRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - itemRect.top;
        }
      }
    }
  }, [selectedIndex]);

  const handleOnOpen = (open: boolean) => {
    setisOpen(open);
    if (!open) setQuery("");
    setSelectedIndex(open && props.variables.length > 0 ? 0 : -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (props.variables.length === 0 || !isOpen) return;

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          props.addVariable(t(`${props.variables[selectedIndex]}_variable`));
        }
        setisOpen(false);
        setSelectedIndex(-1);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev <= 0) return props.variables.length - 1;
          return prev - 1;
        });
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev >= props.variables.length - 1) return 0;
          return prev + 1;
        });
        break;
      case "Escape":
        e.preventDefault();
        setisOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

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
    <Dropdown onOpenChange={handleOnOpen} open={isOpen}>
      <DropdownMenuTrigger aria-label="Add variable" className="focus:bg-muted pt-[6px] focus:outline-none">
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
      <DropdownMenuContent className="w-96" onKeyDown={handleKeyDown}>
        <div className="p-4">
          <div className="text-subtle mb-3 text-left text-xs font-medium uppercase tracking-wide">
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
          <div className="max-h-64 overflow-y-auto md:max-h-80" ref={dropdownContainerRef}>
            {filteredVariables.length === 0 ? (
              <div className="text-subtle px-4 py-2 text-center text-sm">{t("no_variables_found")}</div>
            ) : (
              filteredVariables.map((variable, index) => (
                <DropdownMenuItem key={variable} className="p-0 hover:ring-0 focus:outline-none">
                  <button
                    ref={(el) => (itemRefs.current[index] = el)}
                    key={variable}
                    type="button"
                    className={`hover:bg-muted w-full rounded-md px-3 py-2 text-left transition-colors focus:outline-none ${
                      selectedIndex === index ? "bg-muted" : ""
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    data-active={selectedIndex === index}
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
