"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { getEventLocationType } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import PhoneInput from "@calcom/features/components/phone-input";
import type { LocationOption } from "@calcom/features/form/components/LocationSelect";
import LocationSelect from "@calcom/features/form/components/LocationSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, TextField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Skeleton } from "@calcom/ui/components/skeleton";

import type { FormValues, Host, HostLocation } from "../../lib/types";
import type { TLocationOptions } from "./Locations";

type HostWithLocationOptions = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  defaultConferencingApp: {
    appSlug?: string;
    appLink?: string;
  } | null;
  location: {
    id: number;
    type: string;
    credentialId: number | null;
    link: string | null;
    address: string | null;
    phoneNumber: string | null;
  } | null;
  installedApps: {
    appId: string | null;
    credentialId: number;
    type: string;
    locationOption?: {
      value: string;
      label: string;
      icon?: string;
    };
  }[];
};

type HostLocationsProps = {
  eventTypeId: number;
  locationOptions: TLocationOptions;
};

const getAppSlugFromLocationType = (locationType: string): string | null => {
  if (locationType.startsWith("integrations:")) {
    const parts = locationType.replace("integrations:", "").split(":");
    if (parts[0] === "daily") return "daily-video";
    if (parts[0] === "google") return "google-meet";
    if (parts[0] === "zoom") return "zoom";
    if (parts[0] === "teams") return "msteams";
    if (parts[0] === "huddle01") return "huddle01";
    if (parts[0] === "whereby") return "whereby";
    if (parts[0] === "around") return "around";
    if (parts[0] === "riverside") return "riverside";
    if (parts[0] === "webex") return "webex";
    return parts[0];
  }
  return null;
};

const isStaticLocationType = (locationType: string): boolean => {
  const staticTypes = ["inPerson", "link", "userPhone", "phone", "attendeeInPerson", "somewhereElse"];
  return staticTypes.includes(locationType);
};

const isCalVideo = (locationType: string): boolean => {
  return locationType === "integrations:daily";
};

const getLocationFromOptions = (
  locationType: string,
  locationOptions: TLocationOptions
): LocationOption | undefined => {
  for (const group of locationOptions) {
    const option = group.options.find((opt) => opt.value === locationType);
    if (option) return option;
  }
  return undefined;
};

type HostLocationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  locationOption: LocationOption | null;
  onSave: (location: HostLocation) => void;
  hostUserId: number;
  hostData?: HostWithLocationOptions;
  initialValue?: string;
};

const HostLocationDialog = ({
  isOpen,
  onClose,
  locationOption,
  onSave,
  hostUserId,
  hostData,
  initialValue,
}: HostLocationDialogProps) => {
  const { t } = useLocale();
  const eventLocationType = locationOption ? getEventLocationType(locationOption.value) : null;

  const [inputValue, setInputValue] = useState(initialValue || "");

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue || "");
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    if (!locationOption || !eventLocationType) return;

    const credential = hostData?.installedApps.find(
      (app) =>
        app.appId === getAppSlugFromLocationType(locationOption.value) || app.type === locationOption.value
    );

    const location: HostLocation = {
      userId: hostUserId,
      eventTypeId: 0,
      type: locationOption.value,
      credentialId: credential?.credentialId ?? null,
    };

    if (eventLocationType.organizerInputType === "text") {
      if (eventLocationType.defaultValueVariable === "link") {
        location.link = inputValue;
      } else if (eventLocationType.defaultValueVariable === "address") {
        location.address = inputValue;
      }
    } else if (eventLocationType.organizerInputType === "phone") {
      location.phoneNumber = inputValue;
    }

    onSave(location);
    setInputValue("");
    onClose();
  };

  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  if (!eventLocationType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader title={t("set_location")} />
        <div className="space-y-4">
          <div>
            <Label className="text-default mb-1 block text-sm font-medium">
              {t(eventLocationType.messageForOrganizer || "")}
            </Label>
            {eventLocationType.organizerInputType === "phone" ? (
              <PhoneInput
                value={inputValue}
                onChange={(val) => setInputValue(val || "")}
                placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
              />
            ) : (
              <TextField
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
                type="text"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" color="secondary" onClick={handleClose}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!inputValue}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const HostLocationRow = ({
  host,
  hostData,
  locationOptions,
  onLocationChange,
}: {
  host: Host;
  hostData?: HostWithLocationOptions;
  locationOptions: TLocationOptions;
  onLocationChange: (userId: number, location: HostLocation | null) => void;
}) => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingLocationOption, setPendingLocationOption] = useState<LocationOption | null>(null);

  const currentLocation = host.location;

  const selectedOption = useMemo(() => {
    if (currentLocation) {
      return getLocationFromOptions(currentLocation.type, locationOptions);
    }

    if (hostData?.defaultConferencingApp?.appSlug) {
      const locationType = getAppFromSlug(hostData.defaultConferencingApp.appSlug)?.appData?.location?.type;
      if (locationType) {
        return getLocationFromOptions(locationType, locationOptions);
      }
    }

    return getLocationFromOptions("integrations:daily", locationOptions);
  }, [currentLocation, hostData, locationOptions]);

  const hasAppInstalled = useMemo(() => {
    if (!currentLocation?.type) return true;
    if (isStaticLocationType(currentLocation.type)) return true;
    if (isCalVideo(currentLocation.type)) return true;
    if (!hostData) return true;

    const appSlug = getAppSlugFromLocationType(currentLocation.type);
    if (!appSlug) return true;

    return hostData.installedApps.some((app) => app.appId === appSlug || app.type === currentLocation.type);
  }, [currentLocation, hostData]);

  const matchingCredential = useMemo(() => {
    if (!currentLocation?.type || !hostData) return null;
    if (isStaticLocationType(currentLocation.type)) return null;
    if (isCalVideo(currentLocation.type)) return null;

    const appSlug = getAppSlugFromLocationType(currentLocation.type);
    if (!appSlug) return null;

    return hostData.installedApps.find((app) => app.appId === appSlug || app.type === currentLocation.type);
  }, [currentLocation, hostData]);

  const displayName = hostData?.name || `User ${host.userId}`;
  const avatarUrl = hostData?.avatarUrl || "";

  const currentLocationEventType = currentLocation ? getEventLocationType(currentLocation.type) : null;
  const hasOrganizerInput = !!currentLocationEventType?.organizerInputType;

  const currentLocationValue = useMemo(() => {
    if (!currentLocation || !currentLocationEventType) return "";
    if (currentLocationEventType.defaultValueVariable === "link") {
      return currentLocation.link || "";
    }
    if (currentLocationEventType.defaultValueVariable === "address") {
      return currentLocation.address || "";
    }
    if (currentLocationEventType.organizerInputType === "phone") {
      return currentLocation.phoneNumber || "";
    }
    return "";
  }, [currentLocation, currentLocationEventType]);

  const handleEditClick = () => {
    if (selectedOption) {
      setPendingLocationOption(selectedOption);
      setIsDialogOpen(true);
    }
  };

  const handleLocationSelect = (option: LocationOption | null) => {
    if (!option) {
      onLocationChange(host.userId, null);
      return;
    }

    const eventLocationType = getEventLocationType(option.value);

    if (eventLocationType?.organizerInputType) {
      setPendingLocationOption(option);
      setIsDialogOpen(true);
      return;
    }

    const credential = hostData?.installedApps.find(
      (app) => app.appId === getAppSlugFromLocationType(option.value) || app.type === option.value
    );
    onLocationChange(host.userId, {
      userId: host.userId,
      eventTypeId: 0,
      type: option.value,
      credentialId: credential?.credentialId ?? null,
    });
  };

  const handleDialogSave = (location: HostLocation) => {
    onLocationChange(host.userId, location);
    setPendingLocationOption(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setPendingLocationOption(null);
  };

  return (
    <>
      <div className="border-subtle flex items-center gap-3 border-b px-3 py-3 last:border-b-0">
        <Avatar size="sm" imageSrc={avatarUrl} alt={displayName} className="min-w-8" />
        <div className="min-w-0 flex-1">
          <div className="text-emphasis truncate text-sm font-medium">{displayName}</div>
          {hostData?.email && <div className="text-subtle truncate text-xs">{hostData.email}</div>}
        </div>
        <div className="flex items-center gap-2">
          <LocationSelect
            placeholder={t("select_location")}
            options={locationOptions}
            value={selectedOption}
            isSearchable={false}
            className="w-72 text-sm"
            menuPlacement="auto"
            onChange={handleLocationSelect}
          />
          {hasOrganizerInput && currentLocation && (
            <Button color="secondary" type="button" StartIcon="pencil" onClick={handleEditClick} />
          )}
          {currentLocation && !hasAppInstalled && (
            <Badge variant="orange" className="whitespace-nowrap">
              <Icon name="alert" className="mr-1 h-3 w-3" />
              {t("app_not_installed")}
            </Badge>
          )}
          {currentLocation && hasAppInstalled && matchingCredential && (
            <Icon name="check" className="text-success h-4 w-4" />
          )}
        </div>
      </div>
      <HostLocationDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        locationOption={pendingLocationOption}
        onSave={handleDialogSave}
        hostUserId={host.userId}
        hostData={hostData}
        initialValue={currentLocationValue}
      />
    </>
  );
};

const MassApplySelect = ({
  locationOptions,
  onApply,
}: {
  locationOptions: TLocationOptions;
  onApply: (locationType: string) => void;
}) => {
  const { t } = useLocale();

  const options = useMemo(() => {
    return locationOptions.flatMap((group) =>
      group.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }))
    );
  }, [locationOptions, t]);

  return (
    <Select
      placeholder={t("select_option_hosts")}
      options={options}
      isSearchable={false}
      className="w-56 text-sm"
      onChange={(option) => {
        if (option?.value) {
          onApply(option.value);
        }
      }}
    />
  );
};

export const HostLocations = ({ eventTypeId, locationOptions }: HostLocationsProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const enablePerHostLocations = formMethods.watch("enablePerHostLocations");
  const hosts = formMethods.watch("hosts");
  const roundRobinHosts = hosts.filter((h) => !h.isFixed);

  const { data: hostsWithApps, isLoading } = trpc.viewer.eventTypes.getHostsWithLocationOptions.useQuery(
    { eventTypeId },
    { enabled: enablePerHostLocations && eventTypeId > 0 }
  );

  const hostDataMap = useMemo(() => {
    if (!hostsWithApps) return new Map<number, HostWithLocationOptions>();
    return new Map(hostsWithApps.map((h) => [h.userId, h]));
  }, [hostsWithApps]);

  const mergedLocationOptions = useMemo(() => {
    if (!hostsWithApps) return locationOptions;

    const existingValues = new Set<string>();
    locationOptions.forEach((group) => {
      group.options.forEach((opt) => existingValues.add(opt.value));
    });

    const hostAppsOptions: TLocationOptions[number]["options"] = [];
    hostsWithApps.forEach((host) => {
      host.installedApps.forEach((app) => {
        if (app.locationOption && !existingValues.has(app.locationOption.value)) {
          existingValues.add(app.locationOption.value);
          hostAppsOptions.push({
            value: app.locationOption.value,
            label: app.locationOption.label,
            icon: app.locationOption.icon,
          });
        }
      });
    });

    if (hostAppsOptions.length === 0) return locationOptions;

    const conferencingGroup = locationOptions.find(
      (g) => g.label.toLowerCase().includes("conferencing") || g.label.toLowerCase().includes("video")
    );

    if (conferencingGroup) {
      return locationOptions.map((group) => {
        if (group === conferencingGroup) {
          return {
            ...group,
            options: [...group.options, ...hostAppsOptions],
          };
        }
        return group;
      });
    }

    return [...locationOptions, { label: t("conferencing"), options: hostAppsOptions }];
  }, [locationOptions, hostsWithApps, t]);

  const handleToggle = (checked: boolean) => {
    formMethods.setValue("enablePerHostLocations", checked, { shouldDirty: true });
    if (!checked) {
      const updatedHosts = hosts.map((host) => ({
        ...host,
        location: null,
      }));
      formMethods.setValue("hosts", updatedHosts, { shouldDirty: true });
    }
  };

  const handleLocationChange = (userId: number, location: HostLocation | null) => {
    const updatedHosts = hosts.map((host) => {
      if (host.userId === userId) {
        return { ...host, location };
      }
      return host;
    });
    formMethods.setValue("hosts", updatedHosts, { shouldDirty: true });
  };

  const handleMassApply = (locationType: string) => {
    const updatedHosts = hosts.map((host) => {
      if (host.isFixed) return host;
      const hostData = hostDataMap.get(host.userId);
      const credential = hostData?.installedApps.find(
        (app) => app.appId === getAppSlugFromLocationType(locationType) || app.type === locationType
      );
      return {
        ...host,
        location: {
          userId: host.userId,
          eventTypeId: 0,
          type: locationType,
          credentialId: credential?.credentialId ?? null,
        },
      };
    });
    formMethods.setValue("hosts", updatedHosts, { shouldDirty: true });
  };

  if (roundRobinHosts.length === 0) {
    return null;
  }

  return (
    <div className="border-subtle rounded-lg border p-6">
      <div className="space-y-4">
        <SettingsToggle
          title={t("enable_custom_host_locations")}
          description={t("enable_custom_host_locations_description")}
          checked={enablePerHostLocations}
          onCheckedChange={handleToggle}
        />

        {enablePerHostLocations && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton as={Label} loadingClassName="w-24">
                {t("host_locations")}
              </Skeleton>
              <MassApplySelect locationOptions={mergedLocationOptions} onApply={handleMassApply} />
            </div>

            <div className="border-subtle rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Icon name="loader" className="text-subtle h-5 w-5 animate-spin" />
                </div>
              ) : (
                roundRobinHosts.map((host) => (
                  <HostLocationRow
                    key={host.userId}
                    host={host}
                    hostData={hostDataMap.get(host.userId)}
                    locationOptions={mergedLocationOptions}
                    onLocationChange={handleLocationChange}
                  />
                ))
              )}
            </div>

            <p className="text-subtle text-xs">{t("host_locations_fallback_description")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostLocations;
