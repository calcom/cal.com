import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { HashedLinkUsageIndicator } from "@calcom/features/eventtypes/components/HashedLinkUsageIndicator";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
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
import classNames from "@calcom/ui/classNames";

export const MultiplePrivateLinksController = ({
  team,
  bookerUrl,
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl">): JSX.Element => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [animateRef] = useAutoAnimate<HTMLUListElement>();
  const [linkTypes, setLinkTypes] = useState<Record<number, "single" | "time" | "usage">>({});
  const [forceUpdate, setForceUpdate] = useState(0);

  // Fetch latest data for all links
  const trpcUtils = trpc.useUtils();

  // This will force a refetch when the component mounts
  useEffect(() => {
    // Invalidate the cache to force fresh data fetch
    trpcUtils.viewer.eventTypes.getHashedLink.invalidate();
  }, [trpcUtils]);

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
          typeof val === "string" ? { link: val, expiresAt: null, maxUsageCount: null, usageCount: 0 } : val
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
          const userId = formMethods.getValues("users")?.[0]?.id ?? team?.id;
          if (!userId) return;

          const newPrivateLink = {
            link: generateHashedLink(userId),
            expiresAt: null,
            maxUsageCount: null,
            usageCount: 0,
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

              // Always fetch the latest data for this link
              const { data: latestLinkData } = trpc.viewer.eventTypes.getHashedLink.useQuery(
                { linkId: val.link },
                {
                  enabled: !!val.link,
                  staleTime: 0,
                  refetchOnMount: true,
                }
              );

              // Use the latest data from DB if available, otherwise fallback to the form data
              const latestUsageCount = latestLinkData?.usageCount ?? (val.usageCount || 0);

              // Determine link type description
              let linkDescription = t("single_use_link");
              if (val.expiresAt) {
                const expiryDate = new Date(val.expiresAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                });
                const now = new Date();
                const isExpired = new Date(val.expiresAt) < now;

                linkDescription = isExpired
                  ? t("link_expired_on_date", { date: expiryDate })
                  : t("expires_on_date", { date: expiryDate });
              } else if (
                val.maxUsageCount !== undefined &&
                val.maxUsageCount !== null &&
                !isNaN(Number(val.maxUsageCount))
              ) {
                const remainingUses = val.maxUsageCount - latestUsageCount;
                const isUsageExceeded = remainingUses <= 0;

                if (isUsageExceeded) {
                  linkDescription = t("usage_limit_reached");
                } else if (val.maxUsageCount === 1) {
                  linkDescription = t("single_use_link");
                } else {
                  // Use the real-time data from DB for display
                  linkDescription = `${remainingUses} of ${val.maxUsageCount} uses remaining`;
                }
              }

              return (
                <li data-testid="add-single-use-link" className="mb-6 flex flex-col" key={val.link}>
                  <div className="flex items-center">
                    <TextField
                      containerClassName={classNames("w-full")}
                      disabled
                      value={singleUseURL}
                      className="bg-gray-50"
                      data-testid="private-link-url"
                      addOnSuffix={
                        <Tooltip content={t("copy_link")}>
                          <Button
                            type="button"
                            color="minimal"
                            size="sm"
                            StartIcon="copy"
                            onClick={() => {
                              navigator.clipboard.writeText(singleUseURL);
                              showToast(t("link_copied"), "success");
                            }}
                          />
                        </Tooltip>
                      }
                    />
                    <div className="ml-2 flex items-center">
                      <HashedLinkUsageIndicator link={val.link} />
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
                                updateLinkOption(key, {
                                  expiresAt: null,
                                  maxUsageCount: null,
                                  usageCount: 0,
                                });
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
                                  // Set default expiration to 7 days from now
                                  const defaultExpiry = new Date();
                                  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
                                  updateLinkOption(key, {
                                    expiresAt: defaultExpiry,
                                    maxUsageCount: null,
                                    usageCount: 0,
                                  });
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
                                  updateLinkOption(key, {
                                    expiresAt: null,
                                    maxUsageCount: null,
                                    usageCount: 0,
                                  });
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
