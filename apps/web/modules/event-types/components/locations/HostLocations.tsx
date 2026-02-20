"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CSSObjectWithLabel } from "react-select";
import { components } from "react-select";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import {
  defaultLocations,
  getAppSlugFromLocationType,
  getEventLocationType,
  isCalVideoLocation,
  isStaticLocationType,
} from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import PhoneInput from "@calcom/web/components/phone-input";
import invertLogoOnDark from "@calcom/lib/invertLogoOnDark";
import type { LocationOption } from "@calcom/features/form/components/LocationSelect";
import LocationSelect from "@calcom/features/form/components/LocationSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, TextField, Select, SettingsToggle } from "@calcom/ui/components/form";
import { LoaderIcon, TriangleAlertIcon } from "@coss/ui/icons";
import { Skeleton } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import type { FormValues, Host, HostLocation } from "@calcom/features/eventtypes/lib/types";
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
    id: string;
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

const filterOutBookerInputLocations = (options: TLocationOptions): TLocationOptions => {
  return options
    .map((group) => ({
      ...group,
      options: group.options.filter((opt) => {
        const locationType = getEventLocationType(opt.value);
        return !locationType?.attendeeInputType;
      }),
    }))
    .filter((group) => group.options.length > 0);
};

type LocationInputDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  locationOption: LocationOption | null;
  onSave: (inputValue: string) => void;
  title: string;
  saveButtonText: string;
  initialValue?: string;
};

const LocationInputDialog = ({
  isOpen,
  onClose,
  locationOption,
  onSave,
  title,
  saveButtonText,
  initialValue = "",
}: LocationInputDialogProps) => {
  const { t } = useLocale();
  const eventLocationType = locationOption ? getEventLocationType(locationOption.value) : null;
  const [inputValue, setInputValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(inputValue);
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
        <DialogHeader title={t(title)} />
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
            {t(saveButtonText)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const checkAppInstalledForHost = (locationValue: string, hostData?: HostWithLocationOptions): boolean => {
  if (isStaticLocationType(locationValue)) return true;
  if (isCalVideoLocation(locationValue)) return true;
  if (!hostData) return true;

  const appSlug = getAppSlugFromLocationType(locationValue);
  if (!appSlug) return true;

  return hostData.installedApps.some((app) => app.appId === appSlug || app.type === locationValue);
};

const annotateOptionsForHost = (
  locationOptions: TLocationOptions,
  hostData: HostWithLocationOptions | undefined,
  notInstalledLabel: string
): TLocationOptions => {
  if (!hostData) return locationOptions;

  return locationOptions.map((group) => ({
    ...group,
    options: group.options.map((opt) => {
      if (checkAppInstalledForHost(opt.value, hostData)) return opt;
      return { ...opt, label: `${opt.label} (${notInstalledLabel})` };
    }),
  }));
};

const findHostCredential = (hostData: HostWithLocationOptions | undefined, locationValue: string) => {
  return hostData?.installedApps.find(
    (app) => app.appId === getAppSlugFromLocationType(locationValue) || app.type === locationValue
  );
};

const buildHostLocation = (
  userId: number,
  eventTypeId: number,
  locationOption: LocationOption,
  hostData: HostWithLocationOptions | undefined,
  inputValue?: string
): HostLocation => {
  const eventLocationType = getEventLocationType(locationOption.value);
  const credential = findHostCredential(hostData, locationOption.value);

  const location: HostLocation = {
    userId,
    eventTypeId,
    type: locationOption.value,
    credentialId: credential?.credentialId ?? null,
  };

  if (eventLocationType?.organizerInputType === "text") {
    if (eventLocationType.defaultValueVariable === "link") {
      location.link = inputValue;
    } else if (eventLocationType.defaultValueVariable === "address") {
      location.address = inputValue;
    }
  } else if (eventLocationType?.organizerInputType === "phone") {
    location.phoneNumber = inputValue;
  }

  return location;
};

const getSelectedOption = (
  currentLocation: HostLocation | null | undefined,
  hostData: HostWithLocationOptions | undefined,
  options: TLocationOptions
): LocationOption | undefined => {
  if (currentLocation) {
    return getLocationFromOptions(currentLocation.type, options);
  }

  if (hostData?.defaultConferencingApp?.appSlug) {
    const locationType = getAppFromSlug(hostData.defaultConferencingApp.appSlug)?.appData?.location?.type;
    if (locationType) {
      return getLocationFromOptions(locationType, options);
    }
  }

  return getLocationFromOptions("integrations:daily", options);
};

const HostLocationRow = ({
  host,
  hostData,
  locationOptions,
  eventTypeId,
  onLocationChange,
}: {
  host: Host;
  hostData?: HostWithLocationOptions;
  locationOptions: TLocationOptions;
  eventTypeId: number;
  onLocationChange: (userId: number, location: HostLocation | null) => void;
}) => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingLocationOption, setPendingLocationOption] = useState<LocationOption | null>(null);

  const currentLocation = host.location;

  const hasAppInstalled = useMemo(() => {
    if (!currentLocation?.type) return true;
    return checkAppInstalledForHost(currentLocation.type, hostData);
  }, [currentLocation, hostData]);

  const hostAnnotatedOptions = useMemo(
    () => annotateOptionsForHost(locationOptions, hostData, t("app_not_installed")),
    [locationOptions, hostData, t]
  );

  const selectedOption = useMemo(
    () => getSelectedOption(currentLocation, hostData, locationOptions),
    [currentLocation, hostData, locationOptions]
  );

  const currentLocationEventType = currentLocation ? getEventLocationType(currentLocation.type) : null;
  const hasOrganizerInput = !!currentLocationEventType?.organizerInputType;

  const currentLocationValue = useMemo(() => {
    if (!currentLocation || !currentLocationEventType) return "";
    if (currentLocationEventType.defaultValueVariable === "link") return currentLocation.link || "";
    if (currentLocationEventType.defaultValueVariable === "address") return currentLocation.address || "";
    if (currentLocationEventType.organizerInputType === "phone") return currentLocation.phoneNumber || "";
    return "";
  }, [currentLocation, currentLocationEventType]);

  const handleLocationSelect = (option: LocationOption | null) => {
    if (!option) {
      onLocationChange(host.userId, null);
      return;
    }
    if (getEventLocationType(option.value)?.organizerInputType) {
      setPendingLocationOption(option);
      setIsDialogOpen(true);
      return;
    }
    onLocationChange(host.userId, buildHostLocation(host.userId, eventTypeId, option, hostData));
  };

  return (
    <>
      <div className="border-subtle flex items-center gap-3 border-b px-3 py-3 last:border-b-0">
        <Avatar
          size="sm"
          imageSrc={hostData?.avatarUrl || undefined}
          alt={hostData?.name || `${t("user")} ${host.userId}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-emphasis truncate text-sm font-medium">
            {hostData?.name || `${t("user")} ${host.userId}`}
          </div>
          {hostData?.email && <div className="text-subtle truncate text-xs">{hostData.email}</div>}
        </div>
        <div className="flex items-center gap-2">
          {currentLocation && !hasAppInstalled && (
            <Badge variant="orange" className="whitespace-nowrap">
              <TriangleAlertIcon className="mr-1 h-3 w-3" />
              {t("app_not_installed")}
            </Badge>
          )}
          <LocationSelect
            placeholder={t("select_location")}
            options={hostAnnotatedOptions}
            value={selectedOption}
            isSearchable={false}
            className="w-72 text-sm"
            menuPlacement="auto"
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel,
            }}
            onChange={handleLocationSelect}
          />
          {hasOrganizerInput && currentLocation && (
            <Button
              color="minimal"
              type="button"
              StartIcon="pencil"
              onClick={() => {
                if (selectedOption) {
                  setPendingLocationOption(selectedOption);
                  setIsDialogOpen(true);
                }
              }}
            />
          )}
        </div>
      </div>
      <LocationInputDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setPendingLocationOption(null);
        }}
        locationOption={pendingLocationOption}
        onSave={(inputValue) => {
          if (!pendingLocationOption) return;
          onLocationChange(
            host.userId,
            buildHostLocation(host.userId, eventTypeId, pendingLocationOption, hostData, inputValue)
          );
          setPendingLocationOption(null);
        }}
        title="set_location"
        saveButtonText="save"
        initialValue={
          pendingLocationOption && pendingLocationOption.value !== currentLocation?.type
            ? ""
            : currentLocationValue
        }
      />
    </>
  );
};

type AllLocationOption = {
  value: string;
  label: string;
  icon?: string;
};

const getAllLocationOptions = (): AllLocationOption[] => {
  const options: AllLocationOption[] = [];
  const seenValues = new Set<string>();

  defaultLocations.forEach((loc) => {
    if (!seenValues.has(loc.type)) {
      seenValues.add(loc.type);
      options.push({
        value: loc.type,
        label: loc.label,
        icon: loc.iconUrl,
      });
    }
  });

  Object.values(appStoreMetadata).forEach((app) => {
    const locationData = app.appData?.location;
    if (locationData && !seenValues.has(locationData.type)) {
      seenValues.add(locationData.type);
      options.push({
        value: locationData.type,
        label: locationData.label || app.name,
        icon: app.logo,
      });
    }
  });

  return options;
};

type MassApplyLocationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (locationType: string, inputValue?: string) => void;
  isApplying: boolean;
};

const useMassApplyDialogState = (isOpen: boolean) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setInputValue("");
    }
  }, [isOpen]);

  const reset = () => {
    setSelectedType(null);
    setInputValue("");
  };

  return { selectedType, setSelectedType, inputValue, setInputValue, reset };
};

const MassApplyLocationDialog = ({ isOpen, onClose, onApply, isApplying }: MassApplyLocationDialogProps) => {
  const { t } = useLocale();
  const { selectedType, setSelectedType, inputValue, setInputValue, reset } = useMassApplyDialogState(isOpen);
  const allLocationOptions = useMemo(() => {
    return getAllLocationOptions().filter((opt) => {
      const locationType = getEventLocationType(opt.value);
      return !locationType?.attendeeInputType;
    });
  }, []);

  const selectedOption = allLocationOptions.find((o) => o.value === selectedType);
  const eventLocationType = selectedType ? getEventLocationType(selectedType) : null;
  const needsInput = eventLocationType?.organizerInputType;

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleApply = () => {
    if (!selectedType) return;
    onApply(selectedType, inputValue || undefined);
  };

  const getTranslatedLabel = (opt: AllLocationOption) => {
    const translated = t(opt.label);
    return translated !== opt.label ? translated : opt.label;
  };

  const selectOptions = allLocationOptions.map((opt) => ({
    value: opt.value,
    label: getTranslatedLabel(opt),
    icon: opt.icon,
  }));
  const selectedTranslatedLabel = selectedOption ? getTranslatedLabel(selectedOption) : null;
  const selectValue = selectedOption
    ? { value: selectedOption.value, label: selectedTranslatedLabel, icon: selectedOption.icon }
    : null;

  const OptionWithIcon = ({ icon, label }: { icon?: string; label: string | null }) => (
    <div className="flex items-center gap-3">
      {icon && <img src={icon} alt="" className={`h-4 w-4 ${invertLogoOnDark(icon)}`} />}
      <span>{label}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader title={t("apply_location_to_all_hosts")} />
        <div className="space-y-4">
          <div>
            <Label className="mb-1">{t("select_location_type")}</Label>
            <Select
              value={selectValue}
              onChange={(option) => {
                setSelectedType(option?.value || null);
                setInputValue("");
              }}
              options={selectOptions}
              className="w-full"
              components={{
                Option: (props) => (
                  <components.Option {...props}>
                    <OptionWithIcon icon={props.data.icon} label={props.data.label} />
                  </components.Option>
                ),
                SingleValue: (props) => (
                  <components.SingleValue {...props}>
                    <OptionWithIcon icon={props.data.icon} label={props.data.label} />
                  </components.SingleValue>
                ),
              }}
            />
          </div>
          {needsInput && eventLocationType && (
            <LocationInputField
              eventLocationType={eventLocationType}
              inputValue={inputValue}
              setInputValue={setInputValue}
            />
          )}
          <Alert severity="info" title={t("mass_apply_fallback_explanation")} />
        </div>
        <DialogFooter>
          <Button type="button" color="secondary" onClick={handleClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!selectedType || (needsInput && !inputValue) || isApplying}
            loading={isApplying}>
            {t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type LocationInputFieldProps = {
  eventLocationType: ReturnType<typeof getEventLocationType>;
  inputValue: string;
  setInputValue: (value: string) => void;
};

const LocationInputField = ({ eventLocationType, inputValue, setInputValue }: LocationInputFieldProps) => {
  const { t } = useLocale();
  if (!eventLocationType) return null;

  return (
    <div>
      <Label className="mb-1">{t(eventLocationType.messageForOrganizer || "")}</Label>
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
  );
};

const useFetchMoreOnScroll = (
  containerRef: React.RefObject<HTMLDivElement>,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) => {
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchNextPage();
    }
  }, [containerRef, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll, containerRef]);
};

const buildFullLocationOptions = (
  locationOptions: TLocationOptions,
  t: (key: string) => string
): TLocationOptions => {
  const existingValues = new Set<string>();
  locationOptions.forEach((group) => {
    group.options.forEach((opt) => existingValues.add(opt.value));
  });

  const additionalOptions: TLocationOptions[number]["options"] = [];
  for (const app of Object.values(appStoreMetadata)) {
    const locationData = app.appData?.location;
    if (!locationData || existingValues.has(locationData.type)) continue;

    const locationType = getEventLocationType(locationData.type);
    if (locationType?.attendeeInputType) continue;

    existingValues.add(locationData.type);
    const translated = t(locationData.label);
    additionalOptions.push({
      value: locationData.type,
      label: translated !== locationData.label ? translated : locationData.label || app.name,
      icon: app.logo,
    });
  }

  if (additionalOptions.length === 0) return locationOptions;

  const conferencingGroup = locationOptions.find(
    (g) => g.label.toLowerCase().includes("conferencing") || g.label.toLowerCase().includes("video")
  );

  if (conferencingGroup) {
    return locationOptions.map((group) => {
      if (group === conferencingGroup) {
        return { ...group, options: [...group.options, ...additionalOptions] };
      }
      return group;
    });
  }

  return [...locationOptions, { label: t("conferencing"), options: additionalOptions }];
};

type HostListProps = {
  hosts: Host[];
  hostDataMap: Map<number, HostWithLocationOptions>;
  locationOptions: TLocationOptions;
  eventTypeId: number;
  onLocationChange: (userId: number, location: HostLocation | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onOpenMassApply: () => void;
};

const HostList = ({
  hosts,
  hostDataMap,
  locationOptions,
  eventTypeId,
  onLocationChange,
  containerRef,
  isLoading,
  isFetchingNextPage,
  onOpenMassApply,
}: HostListProps) => {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton as={Label} loadingClassName="w-24" className="mt-auto mb-0">
          {t("host_locations")}
        </Skeleton>
        <Button type="button" color="secondary" onClick={onOpenMassApply}>
          {t("set_location_for_all_hosts")}
        </Button>
      </div>

      <div ref={containerRef} className="border-subtle max-h-96 overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="text-subtle h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {hosts.map((host) => (
              <HostLocationRow
                key={host.userId}
                host={host}
                hostData={hostDataMap.get(host.userId)}
                locationOptions={locationOptions}
                eventTypeId={eventTypeId}
                onLocationChange={onLocationChange}
              />
            ))}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <LoaderIcon className="text-subtle h-4 w-4 animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-subtle text-xs">{t("host_locations_fallback_description")}</p>
    </div>
  );
};

const useHostLocationsData = (eventTypeId: number, enabled: boolean, locationOptions: TLocationOptions) => {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.viewer.eventTypes.getHostsWithLocationOptions.useInfiniteQuery(
      { eventTypeId, limit: 10 },
      { enabled: enabled && eventTypeId > 0, getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const hostsWithApps = useMemo(() => data?.pages.flatMap((page) => page.hosts) ?? [], [data]);
  const hostDataMap = useMemo(() => new Map(hostsWithApps.map((h) => [h.userId, h])), [hostsWithApps]);
  const fullLocationOptions = useMemo(() => {
    const full = buildFullLocationOptions(locationOptions, t);
    return filterOutBookerInputLocations(full);
  }, [locationOptions, t]);

  useFetchMoreOnScroll(containerRef, hasNextPage, isFetchingNextPage, fetchNextPage);

  return { hostDataMap, fullLocationOptions, containerRef, isLoading, isFetchingNextPage };
};

const normalizeHostLocation = (host: Host, eventTypeId: number): Host => {
  if (!host.location) return host;
  if (host.location.userId && host.location.eventTypeId) return host;
  return {
    ...host,
    location: { ...host.location, userId: host.userId, eventTypeId },
  };
};

const useHostLocationHandlers = (
  formMethods: ReturnType<typeof useFormContext<FormValues>>,
  hosts: Host[],
  eventTypeId: number
) => {
  const handleToggle = (checked: boolean) => {
    formMethods.setValue("enablePerHostLocations", checked, { shouldDirty: true });
    if (!checked) {
      formMethods.setValue(
        "hosts",
        hosts.map((host) => ({ ...host, location: null })),
        { shouldDirty: true }
      );
    }
  };

  const handleLocationChange = (userId: number, location: HostLocation | null) => {
    formMethods.setValue(
      "hosts",
      hosts.map((h) => normalizeHostLocation(h.userId === userId ? { ...h, location } : h, eventTypeId)),
      { shouldDirty: true }
    );
  };

  return { handleToggle, handleLocationChange };
};

const useMassApplyMutation = (
  eventTypeId: number,
  formMethods: ReturnType<typeof useFormContext<FormValues>>,
  hosts: Host[],
  onSuccess: () => void
) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.eventTypes.massApplyHostLocation.useMutation({
    onError: (error) => showToast(error.message, "error"),
  });

  const handleMassApply = (locationType: string, inputValue?: string) => {
    const evtLocType = getEventLocationType(locationType);
    const link = evtLocType?.defaultValueVariable === "link" ? inputValue : undefined;
    const address = evtLocType?.defaultValueVariable === "address" ? inputValue : undefined;
    const phoneNumber = evtLocType?.organizerInputType === "phone" ? inputValue : undefined;

    mutation.mutate(
      { eventTypeId, locationType, link, address, phoneNumber },
      {
        onSuccess: (result) => {
          const updatedHosts = hosts.map((host) => ({
            ...host,
            location: {
              userId: host.userId,
              eventTypeId,
              type: locationType,
              credentialId: null,
              link: link ?? null,
              address: address ?? null,
              phoneNumber: phoneNumber ?? null,
            },
          }));
          formMethods.setValue("hosts", updatedHosts, { shouldDirty: true });

          showToast(t("location_applied_to_hosts", { count: result.updatedCount }), "success");
          onSuccess();
          utils.viewer.eventTypes.getHostsWithLocationOptions.invalidate({ eventTypeId });
        },
      }
    );
  };

  return { handleMassApply, isPending: mutation.isPending };
};

const UpgradeBadge = () => {
  const { t } = useLocale();
  return (
    <a href="/enterprise" className="hover:underline">
      <Badge variant="gray">{t("upgrade")}</Badge>
    </a>
  );
};

export const HostLocations = ({ eventTypeId, locationOptions }: HostLocationsProps) => {
  const { t } = useLocale();
  const session = useSession();
  const formMethods = useFormContext<FormValues>();
  const [isMassApplyDialogOpen, setIsMassApplyDialogOpen] = useState(false);

  const isOrg = !!session.data?.user?.org?.id;
  const enablePerHostLocations = formMethods.watch("enablePerHostLocations");
  const hosts = formMethods.watch("hosts");

  const { hostDataMap, fullLocationOptions, containerRef, isLoading, isFetchingNextPage } =
    useHostLocationsData(eventTypeId, enablePerHostLocations, locationOptions);
  const { handleToggle, handleLocationChange } = useHostLocationHandlers(formMethods, hosts, eventTypeId);
  const { handleMassApply, isPending } = useMassApplyMutation(eventTypeId, formMethods, hosts, () =>
    setIsMassApplyDialogOpen(false)
  );

  if (hosts.length === 0) return null;

  return (
    <div className="border-subtle rounded-lg border p-6">
      <div className="space-y-4">
        <SettingsToggle
          title={t("enable_custom_host_locations")}
          description={t("enable_custom_host_locations_description")}
          checked={enablePerHostLocations}
          onCheckedChange={handleToggle}
          disabled={!isOrg}
          Badge={!isOrg ? <UpgradeBadge /> : undefined}
        />
        {enablePerHostLocations && (
          <HostList
            hosts={hosts}
            hostDataMap={hostDataMap}
            locationOptions={fullLocationOptions}
            eventTypeId={eventTypeId}
            onLocationChange={handleLocationChange}
            containerRef={containerRef}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            onOpenMassApply={() => setIsMassApplyDialogOpen(true)}
          />
        )}
      </div>
      <MassApplyLocationDialog
        isOpen={isMassApplyDialogOpen}
        onClose={() => setIsMassApplyDialogOpen(false)}
        onApply={handleMassApply}
        isApplying={isPending}
      />
    </div>
  );
};

export default HostLocations;
