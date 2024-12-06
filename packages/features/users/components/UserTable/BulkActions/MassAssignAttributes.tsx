import type { Table } from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { createContext, useContext, useState, useMemo, type PropsWithChildren } from "react";
import type { Dispatch, SetStateAction } from "react";

import { DataTableSelectionBar } from "@calcom/features/data-table";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import type { Attribute as _Attribute, AttributeOption } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc";
import {
  Alert,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Icon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  showToast,
} from "@calcom/ui";

import type { UserTableUser } from "../types";

interface Props {
  table: Table<UserTableUser>;
  filters: ColumnFiltersState;
}

type Attribute = _Attribute & { options: AttributeOption[] };

type AttributesContextType = {
  selectedAttribute: string | undefined;
  setSelectedAttribute: Dispatch<SetStateAction<string | undefined>>;
  foundAttributeInCache: Attribute | undefined;

  selectedAttributeOptions: string[];
  setSelectedAttributeOptions: Dispatch<SetStateAction<string[]>>;

  attributes: Attribute[] | undefined;
};

const AttributesContext = createContext<AttributesContextType | null>(null);

function AttributesProvider({ children }: PropsWithChildren) {
  const { data: attributes } = trpc.viewer.attributes.list.useQuery();
  const [selectedAttribute, setSelectedAttribute] = useState<string>();
  const [selectedAttributeOptions, setSelectedAttributeOptions] = useState<string[]>([]);

  const foundAttributeInCache = useMemo(
    () => attributes?.find((attr) => attr.id === selectedAttribute),
    [selectedAttribute, attributes]
  );

  const value: AttributesContextType = {
    selectedAttribute,
    setSelectedAttribute,
    selectedAttributeOptions,
    setSelectedAttributeOptions,
    foundAttributeInCache,
    attributes,
  };

  return <AttributesContext.Provider value={value}>{children}</AttributesContext.Provider>;
}

function useAttributes() {
  const context = useContext(AttributesContext);
  if (!context) {
    throw new Error("useAttributes must be used within an AttributesProvider");
  }
  return context;
}

function getTranslateableStringFromType(type: string) {
  switch (type) {
    case "SINGLE_SELECT":
      return "single_select";
    case "MULTI_SELECT":
      return "multi_select";
    case "TEXT":
      return "text";
    case "NUMBER":
      return "number";
    default:
      return undefined;
  }
}

function SelectedAttributeToAssign() {
  const { t } = useLocale();
  const {
    foundAttributeInCache: foundAttribute,
    selectedAttributeOptions,
    setSelectedAttributeOptions,
  } = useAttributes();

  if (!foundAttribute) {
    return null;
  }

  const translateableType = getTranslateableStringFromType(foundAttribute.type);

  const isSelectable = foundAttribute.type === "SINGLE_SELECT" || foundAttribute.type === "MULTI_SELECT";

  return (
    <CommandList>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="block">{foundAttribute.name}</span>
        {translateableType && <span className="text-muted block text-xs">({t(translateableType)})</span>}
      </div>
      <CommandGroup>
        {isSelectable ? (
          <>
            {foundAttribute.options.map((option) => {
              return (
                <CommandItem
                  key={option.id}
                  className="hover:cursor-pointer"
                  onSelect={() => {
                    if (foundAttribute.type === "SINGLE_SELECT") {
                      setSelectedAttributeOptions([option.id]);
                    } else {
                      setSelectedAttributeOptions((prev: string[]) => {
                        if (prev.includes(option.id)) {
                          return prev.filter((id: string) => id !== option.id);
                        }
                        return [...prev, option.id];
                      });
                    }
                  }}>
                  <span>{option.value}</span>
                  <div
                    className={classNames(
                      "ml-auto flex h-4 w-4 items-center justify-center rounded-sm border"
                    )}>
                    {selectedAttributeOptions?.includes(option.id) ? (
                      <Icon name="check" className={classNames("h-4 w-4")} />
                    ) : null}
                  </div>
                </CommandItem>
              );
            })}
          </>
        ) : (
          <>
            <CommandItem>
              <Input
                defaultValue={selectedAttributeOptions[0] || ""}
                type={foundAttribute.type === "TEXT" ? "text" : "number"}
                onBlur={(e) => {
                  // trigger onBlur so it's set as Apply is pressed (but not onChange) which triggers
                  // a re-render which also loses focus.
                  setSelectedAttributeOptions([e.target.value]);
                }}
              />
            </CommandItem>
          </>
        )}
      </CommandGroup>
    </CommandList>
  );
}

function Content({ showMultiSelectWarning }: { showMultiSelectWarning: boolean }) {
  const { t } = useLocale();
  const {
    selectedAttribute,
    setSelectedAttribute,
    selectedAttributeOptions,
    setSelectedAttributeOptions,
    attributes,
    foundAttributeInCache,
  } = useAttributes();
  if (!selectedAttribute) {
    return (
      <>
        <CommandInput placeholder={t("search")} />
        <CommandList>
          <CommandEmpty>No attributes found</CommandEmpty>
          <CommandGroup>
            {attributes &&
              attributes.map((option) => {
                return (
                  <CommandItem
                    key={option.id}
                    className="hover:cursor-pointer"
                    onSelect={() => {
                      setSelectedAttribute(option.id);
                      setSelectedAttributeOptions([]);
                    }}>
                    <span>{option.name}</span>
                    <div
                      className={classNames("ml-auto flex h-4 w-4 items-center justify-center rounded-sm")}>
                      <Icon name="chevron-right" className={classNames("h-4 w-4")} />
                    </div>
                  </CommandItem>
                );
              })}
          </CommandGroup>
        </CommandList>
      </>
    );
  }

  if (showMultiSelectWarning) {
    return (
      <div className="max-h-[300px] overflow-y-auto overflow-x-hidden px-3 py-2">
        <Alert
          severity="warning"
          message="You are mass assigning to a multi select. This will assign the attribute to all selected users and
          will not override existing values."
        />
      </div>
    );
  }

  if (selectedAttribute) {
    return <SelectedAttributeToAssign />;
  }

  return null;
}

function MassAssignAttributesBulkActionComponent({ table, filters }: Props) {
  const {
    selectedAttribute,
    setSelectedAttribute,
    selectedAttributeOptions,
    setSelectedAttributeOptions,
    foundAttributeInCache,
  } = useAttributes();

  const [showMultiSelectWarning, setShowMultiSelectWarning] = useState(false);
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const bulkAssignAttributes = trpc.viewer.attributes.bulkAssignAttributes.useMutation({
    onSuccess: (success) => {
      // Optimistically update the infinite query data
      const selectedRows = table.getSelectedRowModel().flatRows;

      utils.viewer.organizations.listMembers.setInfiniteData(
        {
          limit: 10,
          searchTerm: "",
          expand: ["attributes"],
          filters: filters.map((filter) => ({
            id: filter.id,
            value: filter.value as string[],
          })),
        },
        // @ts-expect-error i really dont know how to type this
        (oldData) => {
          if (!oldData) {
            return {
              pages: [],
              pageParams: [],
            };
          }

          const newPages = oldData?.pages.map((page) => ({
            ...page,
            rows: page.rows.map((row) => {
              if (selectedRows.some((selectedRow) => selectedRow.original.id === row.id)) {
                // Update the attributes for the selected users

                const attributeOptionValues = foundAttributeInCache?.options.filter((option) =>
                  selectedAttributeOptions.includes(option.id)
                );

                const newAttributes =
                  row.attributes?.filter((attr) => attr.attributeId !== selectedAttribute) || [];

                if (attributeOptionValues && attributeOptionValues.length > 0) {
                  const newAttributeValues = attributeOptionValues?.map((value) => ({
                    id: value.id,
                    attributeId: value.attributeId,
                    value: value.value,
                    slug: value.slug,
                    contains: value.contains,
                    isGroup: value.isGroup,
                  }));
                  newAttributes.push(...newAttributeValues);
                } else {
                  // Text or number input we don't have an option to fall back on
                  newAttributes.push({
                    id: "-1",
                    attributeId: foundAttributeInCache?.id ?? "-1",
                    value: selectedAttributeOptions[0],
                    slug: slugify(selectedAttributeOptions[0]),
                    contains: [],
                    isGroup: false,
                  });
                }

                return {
                  ...row,
                  attributes: newAttributes,
                };
              }
              return row;
            }),
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );

      setSelectedAttribute(undefined);
      setSelectedAttributeOptions([]);
      showToast(success.message, "success");
    },
    onError: (error) => {
      showToast(`Error assigning attributes: ${error.message}`, "error");
    },
  });

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setSelectedAttribute(undefined);
          setSelectedAttributeOptions([]);
          setShowMultiSelectWarning(false);
        }
      }}>
      <PopoverTrigger asChild>
        <DataTableSelectionBar.Button icon="tags">{t("add_attributes")}</DataTableSelectionBar.Button>
      </PopoverTrigger>
      {/* We dont really use shadows much - but its needed here  */}
      <PopoverContent className="p-0 shadow-md" align="start" sideOffset={12}>
        <Command>
          <Content showMultiSelectWarning={showMultiSelectWarning} />
        </Command>
        <div className="my-1.5 flex w-full justify-end gap-2 p-1.5">
          {selectedAttribute ? (
            <>
              <Button
                color="secondary"
                className="rounded-md"
                size="sm"
                onClick={() => {
                  setSelectedAttribute(undefined);
                  setSelectedAttributeOptions([]);
                  setShowMultiSelectWarning(false);
                }}>
                {t("clear")}
              </Button>
              <Button
                className="rounded-md"
                loading={bulkAssignAttributes.isPending}
                size="sm"
                onClick={() => {
                  if (
                    foundAttributeInCache &&
                    foundAttributeInCache.type === "MULTI_SELECT" &&
                    !showMultiSelectWarning
                  ) {
                    setShowMultiSelectWarning(true);
                  } else {
                    if (!foundAttributeInCache) {
                      return;
                    }
                    setShowMultiSelectWarning(false);
                    let attributesToAssign;
                    if (
                      foundAttributeInCache?.type === "MULTI_SELECT" ||
                      foundAttributeInCache?.type === "SINGLE_SELECT"
                    ) {
                      attributesToAssign = [
                        {
                          id: foundAttributeInCache.id,
                          options: selectedAttributeOptions.map((v) => ({
                            value: v,
                          })),
                        },
                      ];
                    } else {
                      attributesToAssign = [
                        { id: foundAttributeInCache.id, value: selectedAttributeOptions[0] },
                      ];
                    }

                    bulkAssignAttributes.mutate({
                      attributes: attributesToAssign,
                      userIds: table.getSelectedRowModel().rows.map((row) => row.original.id),
                    });
                  }
                }}>
                {t("apply")}
              </Button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MassAssignAttributesBulkAction({ table, filters }: Props) {
  return (
    <AttributesProvider>
      <MassAssignAttributesBulkActionComponent table={table} filters={filters} />
    </AttributesProvider>
  );
}
