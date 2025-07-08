import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { DatePicker } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
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
      // Convert the selected date to end of day in user's timezone, then to UTC for storage
      const selectedDate = date || expiryDate;
      const userTz = userTimeZone || dayjs.tz.guess();

      // Create a dayjs object in the user's timezone with the selected date
      // This ensures we're working with the date as intended in the user's timezone
      const endOfDayInUserTz = dayjs
        .tz(dayjs(selectedDate).format("YYYY-MM-DD"), userTz)
        .endOf("day")
        .utc()
        .toDate();

      convertedValue[index] = {
        ...convertedValue[index],
        expiresAt: endOfDayInUserTz,
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
    // Set initial values based on current link
    if (currentLink.expiresAt) {
      setSelectedType("time");
      setExpiryDate(new Date(currentLink.expiresAt));
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

            // Create a new private link
            const newPrivateLink = {
              link: generateHashedLink(userId),
              expiresAt: null,
              maxUsageCount: 1,
              usageCount: 0,
            };

            // Simply add the new link without syncing existing data
            // Server data is used for display only, not for form updates
            const newValue = [...convertedValue, newPrivateLink];
            onChange(newValue);
          };

          const removePrivateLink = (index: number) => {
            const newValue = [...convertedValue];
            newValue.splice(index, 1);
            onChange(newValue);

            // If we're removing the last link and the toggle control is passed,
            // turn off the private links toggle
            if (newValue.length === 0 && setMultiplePrivateLinksVisible) {
              setMultiplePrivateLinksVisible(false);
            }
          };

          return (
            <ul ref={animateRef}>
              {convertedValue.map((val, key) => {
                const singleUseURL = `${bookerUrl}/d/${val.link}/${formMethods.getValues("slug")}`;

                // Get the link data from our map instead of individual queries
                const latestLinkData = linkDataMap.get(val.link);
                const latestUsageCount =
                  latestLinkData?.usageCount ?? ((val as PrivateLinkWithOptions).usageCount || 0);

                // Determine if link is expired and create description
                let linkDescription = t("remainder_of_maximum_uses_left", {
                  remainder: "1",
                  maximum_uses: "1 use",
                });
                let isExpired = false;

                if (val.expiresAt) {
                  // Convert stored UTC date to user's timezone for display and comparison
                  const expiryInUserTz = dayjs.utc(val.expiresAt).tz(userTimeZone || dayjs.tz.guess());
                  const expiryDate = expiryInUserTz.format("MMM DD, YYYY");

                  // Compare current time in user's timezone with expiry time
                  const nowInUserTz = dayjs().tz(userTimeZone || dayjs.tz.guess());
                  isExpired = nowInUserTz.isAfter(expiryInUserTz);

                  linkDescription = isExpired
                    ? t("link_expired_on_date", { date: expiryDate })
                    : t("expires_on_date", { date: expiryDate });
                } else if (
                  val.maxUsageCount !== undefined &&
                  val.maxUsageCount !== null &&
                  !isNaN(Number(val.maxUsageCount))
                ) {
                  // Calculate uses and determine if expired
                  const maxUses = val.maxUsageCount;
                  const usedCount = latestUsageCount;
                  const remainingUses = maxUses - usedCount;

                  // Link is expired if usage count has reached or exceeded the limit
                  isExpired = usedCount >= maxUses;

                  if (isExpired) {
                    linkDescription = t("usage_limit_reached");
                  } else {
                    linkDescription = t("remainder_of_maximum_uses_left", {
                      remainder: remainingUses,
                      maximum_uses: `${maxUses} ${remainingUses === 1 ? "use" : "uses"}`,
                    });
                  }
                }

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
                                  navigator.clipboard.writeText(singleUseURL);
                                  showToast(t("link_copied"), "success");
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Badge variant="red">{t("expired")}</Badge>
                          )
                        }
                      />
                      <div className="ml-2 flex items-center">
                        {!isExpired && (
                          <Button
                            type="button"
                            color="minimal"
                            variant="icon"
                            StartIcon="settings"
                            onClick={() => openSettingsDialog(key, val)}
                          />
                        )}
                        <Button
                          data-testid={`remove-single-use-link-${key}`}
                          variant="icon"
                          type="button"
                          StartIcon="trash-2"
                          color="destructive"
                          className="ml-1 border-none"
                          onClick={() => removePrivateLink(key)}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{linkDescription}</div>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent title={t("link_settings")} type="creation">
          <div className="mb-4 space-y-4">
            <RadioArea.Group
              className="space-y-2"
              value={selectedType}
              onValueChange={(value: "time" | "usage") => {
                setSelectedType(value);
                updateLinkSettings(currentLinkIndex, value);
              }}>
              <RadioArea.Item value="usage" className="w-full text-sm">
                <Label className="mb-0 cursor-pointer text-sm font-medium">
                  {t("usage_based_expiration")}
                </Label>
                {selectedType === "usage" && (
                  <div className="mt-2 w-[180px]">
                    <NumberInput
                      required
                      min={1}
                      placeholder={t("number_of_uses")}
                      value={maxUsageCount === null ? "" : maxUsageCount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value === "" ? null : parseInt(e.target.value);
                        if (e.target.value === "") {
                          setMaxUsageCount(null);
                        } else if (!isNaN(Number(value)) && Number(value) > 0) {
                          setMaxUsageCount(value);
                          updateLinkSettings(currentLinkIndex, "usage", undefined, value);
                        }
                      }}
                    />
                  </div>
                )}
              </RadioArea.Item>
              <RadioArea.Item value="time" className="w-full text-sm">
                <Label className="mb-0 cursor-pointer text-sm font-medium">
                  {t("time_based_expiration")}
                </Label>
                {selectedType === "time" && (
                  <div className="mt-2 w-[180px]">
                    <DatePicker
                      date={expiryDate}
                      onDatesChange={(newDate: Date) => {
                        setExpiryDate(newDate);
                        updateLinkSettings(currentLinkIndex, "time", newDate);
                      }}
                    />
                  </div>
                )}
              </RadioArea.Item>
            </RadioArea.Group>
          </div>

          <div className="mb-4 mt-4 flex justify-end">
            <Button type="button" color="primary" onClick={() => setIsDialogOpen(false)}>
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
