import { useState, useRef, useEffect } from "react";

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

  return (
    <Dropdown open={isOpen} onOpenChange={handleOnOpen}>
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
          <div className="max-h-64 overflow-y-auto md:max-h-80" ref={dropdownContainerRef}>
            {props.variables.map((variable, index) => (
              <DropdownMenuItem key={variable} className="p-0 hover:ring-0 focus:outline-none">
                <button
                  ref={(el) => (itemRefs.current[index] = el)}
                  key={variable}
                  type="button"
                  className={`hover:bg-muted w-full rounded-md px-3 py-2 text-left transition-colors focus:outline-none ${
                    selectedIndex === index ? "bg-muted" : ""
                  }`}
                  data-active={selectedIndex === index}
                  onClick={() => props.addVariable(t(`${variable}_variable`))}
                  onMouseEnter={() => setSelectedIndex(index)}>
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
