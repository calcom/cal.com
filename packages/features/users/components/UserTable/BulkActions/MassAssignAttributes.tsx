import type { Table } from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { parseAsString, useQueryState, parseAsArrayOf } from "nuqs";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
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

function useSelectedAttributes() {
  const [selectedAttribute, setSelectedAttribute] = useQueryState("a", parseAsString);
  const utils = trpc.useUtils();
  const attributeData = utils.viewer.attributes.list.getData();
  const foundAttribute = attributeData?.find((attr) => attr.id === selectedAttribute);

  return {
    selectedAttribute,
    setSelectedAttribute,
    foundAttributeInCache: foundAttribute,
  };
}

function useSelectedAttributeOption() {
  return useQueryState("ao", parseAsArrayOf(parseAsString).withDefault([]));
}

function SelectedAttributeToAssign() {
  const { t } = useLocale();
  const [selectedAttributeOption, setSelectedAttributeOption] = useSelectedAttributeOption();
  const { selectedAttribute, setSelectedAttribute } = useSelectedAttributes();
  const utils = trpc.useUtils();
  const attributeData = utils.viewer.attributes.list.getData();
  const foundAttribute = attributeData?.find((attr) => attr.id === selectedAttribute);

  if (!foundAttribute) {
    setSelectedAttribute(null);
    return null;
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
                      setSelectedAttributeOption([option.id]);
                    } else {
                      setSelectedAttributeOption((prev) => {
                        if (prev.includes(option.id)) {
                          return prev.filter((id) => id !== option.id);
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
                    {selectedAttributeOption?.includes(option.id) ? (
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
                defaultValue={selectedAttributeOption[0] || ""}
                type={foundAttribute.type === "TEXT" ? "text" : "number"}
                onBlur={(e) => {
                  // trigger onBlur so it's set as Apply is pressed (but not onChange) which triggers
                  // a re-render which also loses focus.
                  setSelectedAttributeOption([e.target.value]);
                }}
              />
            </CommandItem>
          </>
        )}
      </CommandGroup>
    </CommandList>
  );
}

export function MassAssignAttributesBulkAction({ table, filters }: Props) {
  const { selectedAttribute, setSelectedAttribute, foundAttributeInCache } = useSelectedAttributes();
  const [selectedAttributeOptions, setSelectedAttributeOptions] = useSelectedAttributeOption();
  const [showMultiSelectWarning, setShowMultiSelectWarning] = useState(false);
  const { t } = useLocale();
  const utils = trpc.useContext();
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
                  }));
                  newAttributes.push(...newAttributeValues);
                } else {
                  // Text or number input we don't have an option to fall back on
                  newAttributes.push({
                    id: "-1",
                    attributeId: foundAttributeInCache?.id ?? "-1",
                    value: selectedAttributeOptions[0],
                    slug: slugify(selectedAttributeOptions[0]),
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

      setSelectedAttribute(null);
      setSelectedAttributeOptions([]);
      showToast(success.message, "success");
    },
    onError: (error) => {
      showToast(`Error assigning attributes: ${error.message}`, "error");
    },
  });
  const { data } = trpc.viewer.attributes.list.useQuery();

  function Content() {
    if (!selectedAttribute) {
      return (
        <>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>No attributes found</CommandEmpty>
            <CommandGroup>
              {data &&
                data.map((option) => {
                  return (
                    <CommandItem
                      key={option.id}
                      className="hover:cursor-pointer"
                      onSelect={() => {
                        setSelectedAttribute(option.id);
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

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button StartIcon="map-pin">{t("add_attributes")}</Button>
        </PopoverTrigger>
        {/* We dont really use shadows much - but its needed here  */}
        <PopoverContent className="p-0 shadow-md" align="start" sideOffset={12}>
          <Command>
            <Content />
          </Command>
          <div className="my-1.5 flex w-full justify-end gap-2 p-1.5">
            {selectedAttribute ? (
              <>
                <Button
                  color="secondary"
                  className="rounded-md"
                  size="sm"
                  onClick={() => {
                    setSelectedAttribute(null);
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
    </>
  );
}
