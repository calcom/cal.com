import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { HashedLinkUsageIndicator } from "@calcom/features/eventtypes/components/HashedLinkUsageIndicator";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
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
}: Pick<EventTypeSetupProps["eventType"], "team" | "bookerUrl"> & {
  setMultiplePrivateLinksVisible?: (isVisible: boolean) => void;
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
      convertedValue[index] = {
        ...convertedValue[index],
        expiresAt: date || expiryDate,
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
    } else if (currentLink.maxUsageCount !== null && currentLink.maxUsageCount !== undefined) {
      setSelectedType("usage");
      setMaxUsageCount(currentLink.maxUsageCount);
    } else {
      setSelectedType("usage");
      setExpiryDate(new Date(new Date().setDate(new Date().getDate() + 7))); // Default: 7 days from now
      setMaxUsageCount(1);
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
              staleTime: 0,
              refetchOnMount: true,
            }
          );

          // Create a map of link data for easy access
          const linkDataMap = new Map(allLinksData?.map((data) => [data.linkId, data]) || []);

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
                const latestUsageCount = latestLinkData?.usageCount ?? (val.usageCount || 0);

                // Determine link type description
                let linkDescription = t("single_use_link");
                if (val.expiresAt) {
                  const expiryDate = new Date(val.expiresAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  });
                  const now = new Date();
                  const expiryDateTime = new Date(val.expiresAt);
                  expiryDateTime.setHours(23, 59, 59);
                  const isExpired = expiryDateTime < now;

                  linkDescription = isExpired
                    ? t("link_expired_on_date", { date: expiryDate })
                    : t("expires_on_date", { date: expiryDate });
                } else if (
                  val.maxUsageCount !== undefined &&
                  val.maxUsageCount !== null &&
                  !isNaN(Number(val.maxUsageCount))
                ) {
                  // Calculate uses - if link is still active, there must be at least 1 use remaining
                  const maxUses = val.maxUsageCount;
                  const usedCount = latestUsageCount;
                  const remainingUses = maxUses - usedCount;

                  // Only show limit reached if we've EXCEEDED the limit (used more than max)
                  if (usedCount > maxUses) {
                    linkDescription = t("usage_limit_reached");
                  } else {
                    // Show remaining uses - if usedCount equals maxUses, we still have that last use
                    linkDescription = `${remainingUses} of ${maxUses} ${
                      remainingUses === 1 ? "use" : "uses"
                    } remaining`;
                  }
                }

                return (
                  <li data-testid="add-single-use-link" className="mb-4 flex flex-col" key={val.link}>
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
                        <Button
                          type="button"
                          color="minimal"
                          variant="icon"
                          StartIcon="settings"
                          onClick={() => openSettingsDialog(key, val)}
                        />
                        <Button
                          data-testid={`remove-single-use-link-${key}`}
                          variant="icon"
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
