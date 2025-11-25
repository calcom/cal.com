import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { isLinkExpired as utilsIsLinkExpired } from "@calcom/lib/hashedLinksUtils";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { DatePicker } from "@calcom/ui/components/form";
import { NumberInput } from "@calcom/ui/components/form";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

export const MultiplePrivateLinksController = ({
  team,
  bookerUrl,
  setMultiplePrivateLinksVisible,
  userTimeZone,
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl"> & {
  setMultiplePrivateLinksVisible?: (isVisible: boolean) => void;
  userTimeZone?: string;
}): JSX.Element => {
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
  const [animateRef] = useAutoAnimate<HTMLUListElement>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<"time" | "usage">("usage");
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [maxUsageCount, setMaxUsageCount] = useState<number | null>(1);

  // Updates the form data directly when settings change
  const updateLinkSettings = (
    index: number | null,
    type: "time" | "usage",
    date?: Date,
    usageCount?: number | null
  ) => {
    if (index === null) return;

    const currentValue = formMethods.getValues("multiplePrivateLinks") || [];
    // Convert any string values to PrivateLinkWithOptions
    const convertedValue = currentValue.map((val: string | PrivateLinkWithOptions) =>
      typeof val === "string" ? { link: val, expiresAt: null, maxUsageCount: 1, usageCount: 0 } : val
    );

    if (type === "time") {
      const selectedDate = date || expiryDate;

      const dateString = dayjs(selectedDate).format("YYYY-MM-DD");
      const endOfDayInUTC = dayjs.utc(`${dateString}T23:59:59.999Z`).toDate();

      convertedValue[index] = {
        ...convertedValue[index],
        expiresAt: endOfDayInUTC,
        maxUsageCount: null,
      };
    } else if (type === "usage") {
      convertedValue[index] = {
        ...convertedValue[index],
        expiresAt: null,
        maxUsageCount: usageCount !== undefined ? usageCount : maxUsageCount,
      };
    }

    // Update the form value and trigger form change
    // Store the full objects so the UI can display updated settings immediately
    formMethods.setValue("multiplePrivateLinks", convertedValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const openSettingsDialog = (index: number, currentLink: PrivateLinkWithOptions) => {
    setCurrentLinkIndex(index);
    if (currentLink.expiresAt) {
      setSelectedType("time");
      const expiryDate = dayjs.utc(currentLink.expiresAt).format("YYYY-MM-DD");
      setExpiryDate(dayjs(expiryDate).toDate());
    } else {
      setSelectedType("usage");
      setMaxUsageCount(currentLink.maxUsageCount ?? 1);
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Controller
        name="multiplePrivateLinks"
        control={formMethods.control}
        render={({ field: { value, onChange } }) => {
          if (!value) {
            value = [];
          }

          // Convert any string values to PrivateLinkWithOptions
          const convertedValue = value.map((val: string | PrivateLinkWithOptions) =>
            typeof val === "string" ? { link: val, expiresAt: null, maxUsageCount: null, usageCount: 0 } : val
          );

          // Query all links at once instead of individually
          const { data: allLinksData } = trpc.viewer.eventTypes.getHashedLinks.useQuery(
            { linkIds: convertedValue.map((val) => val.link) },
            {
              enabled: convertedValue.length > 0,
              refetchOnMount: true,
            }
          );

          type HashedLinkData = {
            id: number | string;
            linkId: string;
            expiresAt: Date | null;
            maxUsageCount: number | null;
            usageCount: number;
          };

          const linkDataMap = new Map(allLinksData?.map((data: HashedLinkData) => [data.linkId, data]) || []);

          const addPrivateLink = () => {
            const userId = formMethods.getValues("users")?.[0]?.id ?? team?.id;
            if (!userId) return;

            const newPrivateLink = {
              link: generateHashedLink(userId),
              expiresAt: null,
              maxUsageCount: 1,
              usageCount: 0,
            };

            const newValue = [...convertedValue, newPrivateLink];
            onChange(newValue);
          };

          const removePrivateLink = (index: number) => {
            const newValue = [...convertedValue];
            newValue.splice(index, 1);
            onChange(newValue);

            if (newValue.length === 0 && setMultiplePrivateLinksVisible) {
              setMultiplePrivateLinksVisible(false);
            }
          };

          const isLinkExpired = (val: PrivateLinkWithOptions) => {
            const latestLinkData = linkDataMap.get(val.link);
            const latestUsageCount =
              latestLinkData?.usageCount ?? ((val as PrivateLinkWithOptions).usageCount || 0);

            return utilsIsLinkExpired(
              {
                expiresAt: val.expiresAt,
                maxUsageCount: val.maxUsageCount,
                usageCount: latestUsageCount,
              },
              userTimeZone
            );
          };

          const getLinkDescription = (link: PrivateLinkWithOptions, latestUsageCount?: number) => {
            const isExpired = isLinkExpired(link);
            const usageCount = latestUsageCount ?? (link.usageCount || 0);

            if (link.expiresAt) {
              const expiryDate = dayjs.utc(link.expiresAt).format("MMM DD, YYYY");
              return isExpired
                ? t("link_expired_on_date", { date: expiryDate })
                : t("expires_on_date", { date: expiryDate });
            } else if (
              link.maxUsageCount !== undefined &&
              link.maxUsageCount !== null &&
              !isNaN(Number(link.maxUsageCount))
            ) {
              const maxUses = link.maxUsageCount;
              const remainingUses = maxUses - usageCount;

              if (isExpired) {
                return t("usage_limit_reached");
              } else {
                return remainingUses === 1
                  ? t("remainder_of_maximum_use_left_singular", {
                      remainder: remainingUses,
                      maximum: maxUses,
                    })
                  : t("remainder_of_maximum_uses_left_plural", {
                      remainder: remainingUses,
                      maximum: maxUses,
                    });
              }
            }

            // Default case for links without expiry or usage limits
            return t("remainder_of_maximum_use_left_singular", {
              remainder: "1",
              maximum: "1",
            });
          };

          const sortedLinksWithIndex = convertedValue
            .map((val, originalIndex) => {
              const expired = isLinkExpired(val);
              const hasExpiry = !!val.expiresAt;
              const expiryTime = hasExpiry ? new Date(val.expiresAt!).getTime() : null;

              return {
                val,
                originalIndex,
                expired,
                hasExpiry,
                expiryTime,
              };
            })
            .sort((a, b) => {
              // Sort expired links last
              if (a.expired !== b.expired) {
                return a.expired ? 1 : -1;
              }

              // Both not expired
              if (!a.expired && !b.expired) {
                // Prefer links with expiry date
                if (a.hasExpiry !== b.hasExpiry) {
                  return a.hasExpiry ? -1 : 1;
                }

                // Both have expiry, sort by expiry time
                if (a.hasExpiry && b.hasExpiry) {
                  return a.expiryTime! - b.expiryTime!;
                }

                // Neither has expiry: preserve original order (descending)
                return b.originalIndex - a.originalIndex;
              }

              // Both expired: preserve original order (ascending)
              return a.originalIndex - b.originalIndex;
            });

          return (
            <ul ref={animateRef}>
              {sortedLinksWithIndex.map(({ val, originalIndex }, key) => {
                const singleUseURL = `${bookerUrl}/d/${val.link}/${formMethods.getValues("slug")}`;

                const latestLinkData = linkDataMap.get(val.link);
                const latestUsageCount =
                  latestLinkData?.usageCount ?? ((val as PrivateLinkWithOptions).usageCount || 0);

                const isExpired = isLinkExpired(val);
                const linkDescription = getLinkDescription(val, latestUsageCount);

                return (
                  <li data-testid="add-single-use-link" className="mb-4 flex flex-col" key={val.link}>
                    <div className="flex items-center">
                      <TextField
                        containerClassName={classNames("w-full")}
                        disabled={isExpired}
                        value={singleUseURL}
                        readOnly
                        className={classNames(isExpired ? "bg-red-50 text-gray-400" : "bg-gray-50")}
                        data-testid="private-link-url"
                        addOnSuffix={
                          !isExpired ? (
                            <Tooltip content={t("copy_link")}>
                              <Button
                                type="button"
                                color="minimal"
                                size="sm"
                                StartIcon="copy"
                                onClick={() => {
                                  copyToClipboard(singleUseURL);
                                  showToast(t("link_copied"), "success");
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Badge data-testid="private-link-expired" variant="red">
                              {t("expired")}
                            </Badge>
                          )
                        }
                      />
                      <div className="ml-2 flex items-center">
                        {!isExpired && (
                          <Tooltip content={t("preview")}>
                            <Button
                              type="button"
                              color="minimal"
                              variant="icon"
                              StartIcon="external-link"
                              data-testid="private-link-preview"
                              href={singleUseURL}
                              target="_blank"
                              rel="noreferrer"
                            />
                          </Tooltip>
                        )}
                        {!isExpired && (
                          <Button
                            type="button"
                            color="minimal"
                            variant="icon"
                            StartIcon="settings"
                            data-testid="private-link-settings"
                            onClick={() => openSettingsDialog(originalIndex, val)}
                          />
                        )}
                        <Button
                          data-testid={`remove-private-link-${originalIndex}`}
                          variant="icon"
                          type="button"
                          StartIcon="trash-2"
                          color="destructive"
                          className="ml-1 border-none"
                          onClick={() => removePrivateLink(originalIndex)}
                        />
                      </div>
                    </div>
                    <div data-testid="private-link-description" className="mt-1 text-sm text-gray-500">
                      {linkDescription}
                    </div>
                  </li>
                );
              })}
              <Button
                color="minimal"
                StartIcon="plus"
                onClick={addPrivateLink}
                data-testid="add-private-link-button">
                {t("add_a_multiple_private_link")}
              </Button>
            </ul>
          );
        }}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent title={t("link_settings")} type="creation">
          <div className="mb-4 space-y-4">
            <RadioArea.Group
              className="space-y-2"
              value={selectedType}
              data-testid="private-link-radio-group"
              onValueChange={(value: "time" | "usage") => {
                setSelectedType(value);
              }}>
              <RadioArea.Item value="usage" data-testid="private-link-usage" className="w-full text-sm">
                <strong className="mb-1 block">{t("usage_based_expiration")}</strong>
                <p>
                  {selectedType !== "usage"
                    ? t("usage_based_generic_expiration_description")
                    : t(
                        maxUsageCount === 1
                          ? "usage_based_expiration_description"
                          : "usage_based_expiration_description_plural",
                        { count: maxUsageCount || 0 }
                      )}
                </p>
                {selectedType === "usage" && (
                  <div className="mt-2 w-[180px]">
                    <NumberInput
                      required
                      min={1}
                      data-testid="private-link-usage-count"
                      placeholder={t("number_of_uses")}
                      value={maxUsageCount === null ? "" : maxUsageCount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value === "" ? null : parseInt(e.target.value);
                        if (e.target.value === "") {
                          setMaxUsageCount(null);
                        } else if (!isNaN(Number(value)) && Number(value) > 0) {
                          setMaxUsageCount(value);
                        }
                      }}
                    />
                  </div>
                )}
              </RadioArea.Item>
              <RadioArea.Item data-testid="private-link-time" value="time" className="w-full text-sm">
                <strong className="mb-1 block">{t("time_based_expiration")}</strong>
                {selectedType !== "time"
                  ? t("time_based_generic_expiration_description")
                  : t("time_based_expiration_description", {
                      date: dayjs(expiryDate).format("MMM DD, YYYY"),
                    })}
                {selectedType === "time" && (
                  <div className="mt-2 w-[180px]">
                    <DatePicker
                      data-testid="private-link-expiration-date"
                      date={expiryDate}
                      onDatesChange={(newDate: Date) => {
                        setExpiryDate(newDate);
                      }}
                    />
                  </div>
                )}
              </RadioArea.Item>
            </RadioArea.Group>
          </div>

          <div className="mb-4 mt-4 flex justify-end">
            <Button
              type="button"
              color="primary"
              data-testid="private-link-expiration-settings-save"
              onClick={() => {
                // Save the changes when Save button is clicked
                if (selectedType === "time") {
                  updateLinkSettings(currentLinkIndex, "time", expiryDate);
                } else {
                  updateLinkSettings(currentLinkIndex, "usage", undefined, maxUsageCount);
                }
                setIsDialogOpen(false);
              }}>
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
