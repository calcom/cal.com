import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Icon,
  TextField,
  Tooltip,
  showToast,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DatePicker,
  Label,
  NumberInput,
} from "@calcom/ui";

export const MultiplePrivateLinksController = ({
  team,
  bookerUrl,
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl">) => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [animateRef] = useAutoAnimate<HTMLUListElement>();
  const [linkTypes, setLinkTypes] = useState<Record<number, "single" | "time" | "usage">>({});

  return (
    <Controller
      name="multiplePrivateLinks"
      control={formMethods.control}
      render={({ field: { value, onChange } }) => {
        if (!value) {
          value = [];
        }

        // Convert any string values to PrivateLinkWithOptions
        const convertedValue = value.map((val) =>
          typeof val === "string" ? { link: val, expiresAt: null, maxUsageCount: null } : val
        );

        // Initialize link types if not already set
        convertedValue.forEach((val, index) => {
          if (linkTypes[index] === undefined) {
            setLinkTypes((prev) => ({
              ...prev,
              [index]: val.expiresAt ? "time" : val.maxUsageCount !== null ? "usage" : "single",
            }));
          }
        });

        const addPrivateLink = () => {
          const newPrivateLink = {
            link: generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id),
            expiresAt: null,
            maxUsageCount: null,
          };
          const newValue = [...convertedValue, newPrivateLink];
          onChange(newValue);
          // Set default link type for new link
          setLinkTypes((prev) => ({
            ...prev,
            [newValue.length - 1]: "single",
          }));
        };

        const removePrivateLink = (index: number) => {
          const newValue = [...convertedValue];
          newValue.splice(index, 1);
          onChange(newValue);
          // Update link types after removal
          const newLinkTypes = { ...linkTypes };
          delete newLinkTypes[index];
          const updatedLinkTypes: Record<number, "single" | "time" | "usage"> = {};
          newValue.forEach((_, idx) => {
            if (idx >= index) {
              updatedLinkTypes[idx] = newLinkTypes[idx + 1];
            } else {
              updatedLinkTypes[idx] = newLinkTypes[idx];
            }
          });
          setLinkTypes(updatedLinkTypes);
        };

        const updateLinkOption = (index: number, option: Partial<PrivateLinkWithOptions>) => {
          const newValue = [...convertedValue];
          newValue[index] = { ...newValue[index], ...option };
          onChange(newValue);
        };

        const updateLinkType = (index: number, type: "single" | "time" | "usage") => {
          setLinkTypes((prev) => ({
            ...prev,
            [index]: type,
          }));
        };

        return (
          <ul ref={animateRef}>
            {convertedValue.map((val, key) => {
              const singleUseURL = `${bookerUrl}/d/${val.link}/${formMethods.getValues("slug")}`;
              // Get link type from state
              const linkType = linkTypes[key] || "single";

              // Determine link type description
              let linkDescription = t("single_use_link");
              if (val.expiresAt) {
                linkDescription = t("expires_on_date", {
                  date: new Date(val.expiresAt).toLocaleDateString(),
                });
              } else if (
                val.maxUsageCount !== undefined &&
                val.maxUsageCount !== null &&
                !isNaN(Number(val.maxUsageCount)) &&
                val.maxUsageCount > 1
              ) {
                linkDescription = t("limited_uses", { count: val.maxUsageCount });
              }

              return (
                <li data-testid="add-single-use-link" className="mb-6 flex flex-col" key={val.link}>
                  <div className="flex items-center">
                    <TextField
                      containerClassName="w-full"
                      disabled
                      data-testid={`generated-hash-url-${key}`}
                      labelSrOnly
                      type="text"
                      defaultValue={singleUseURL}
                      addOnSuffix={
                        <Tooltip content={t("copy_to_clipboard")}>
                          <Button
                            color="minimal"
                            size="sm"
                            type="button"
                            aria-label="copy link"
                            onClick={() => {
                              navigator.clipboard.writeText(singleUseURL);
                              showToast(t("multiple_private_link_copied"), "success");
                            }}>
                            <Icon name="copy" className="ml-1 h-4 w-4" />
                          </Button>
                        </Tooltip>
                      }
                    />
                    <div className="ml-2 flex">
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" color="minimal" size="sm" StartIcon="settings" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon="clock"
                              onClick={() => {
                                updateLinkOption(key, { expiresAt: null, maxUsageCount: null });
                                updateLinkType(key, "single");
                              }}>
                              {t("single_use")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon="calendar"
                              onClick={() => {
                                // Show time-based expiration input
                                if (linkType !== "time") {
                                  updateLinkOption(key, { expiresAt: null, maxUsageCount: null });
                                }
                                updateLinkType(key, "time");
                              }}>
                              {t("time_based_expiration")}
                            </DropdownItem>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              StartIcon="user"
                              onClick={() => {
                                // Show usage-based expiration input
                                if (linkType !== "usage") {
                                  updateLinkOption(key, { expiresAt: null, maxUsageCount: null });
                                }
                                updateLinkType(key, "usage");
                              }}>
                              {t("usage_based_expiration")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </Dropdown>
                      {convertedValue.length > 1 && (
                        <Button
                          data-testid={`remove-single-use-link-${key}`}
                          variant="icon"
                          StartIcon="trash-2"
                          color="destructive"
                          className="ml-1 border-none"
                          onClick={() => removePrivateLink(key)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-1 text-sm text-gray-500">{linkDescription}</div>

                  {linkType !== "single" && (
                    <div className="mt-3 space-y-3">
                      {linkType === "time" && (
                        <div>
                          <Label>{t("expires_on")}</Label>
                          <DatePicker
                            date={val.expiresAt ? new Date(val.expiresAt) : new Date()}
                            onDatesChange={(date) => {
                              updateLinkOption(key, { expiresAt: date });
                            }}
                          />
                        </div>
                      )}

                      {linkType === "usage" && (
                        <div>
                          <Label>{t("max_usage_count")}</Label>
                          <NumberInput
                            required
                            min={1}
                            value={val.maxUsageCount === null ? "" : val.maxUsageCount}
                            onChange={(e) => {
                              const value = e.target.value === "" ? null : parseInt(e.target.value);
                              // Only update the maxUsageCount if it's a valid number
                              if (e.target.value === "" || (!isNaN(Number(value)) && Number(value) > 0)) {
                                updateLinkOption(key, { maxUsageCount: value });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            <Button
              color="minimal"
              StartIcon="plus"
              onClick={addPrivateLink}
              data-testid="add-single-use-link-button">
              {t("add_a_multiple_private_link")}
            </Button>
          </ul>
        );
      }}
    />
  );
};
