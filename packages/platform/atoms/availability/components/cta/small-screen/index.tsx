import { Troubleshooter } from "availability/components/troubleshooter";
import type { AvailabilityFormValues } from "availability/types";
import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import { classNames } from "@calcom/lib";
import {
  Button,
  Dialog,
  DialogTrigger,
  ConfirmationDialogContent,
  Skeleton,
  Label,
  TimezoneSelect,
} from "@calcom/ui";
import { ArrowLeft, Trash } from "@calcom/ui/components/icon";
import { SelectSkeletonLoader } from "@calcom/web/components/availability/SkeletonLoader";

type SmallScreenCTAProps = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isDeleteButtonDisabled: boolean;
  isDeleteDialogLoading: boolean;
  onDeleteConfirmation: () => void;
  formControl: Control<AvailabilityFormValues> | undefined;
  // isSwitchDisabled: boolean;
  // isSwitchChecked: boolean;
  // onSwitchCheckedChange: (e: any) => void;
};

// TODO: add ability to set any schedule as default
// cant do it now since we don't take PATCH requests at the moment

export function SmallScreenCTA({
  // isSwitchDisabled,
  // isSwitchChecked,
  //  onSwitchCheckedChange,
  isSidebarOpen,
  toggleSidebar,
  isDeleteButtonDisabled,
  isDeleteDialogLoading,
  onDeleteConfirmation,
  formControl,
}: SmallScreenCTAProps) {
  return (
    <div
      className={classNames(
        isSidebarOpen
          ? "fadeIn fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 transition-opacity dark:bg-opacity-70 sm:hidden"
          : ""
      )}>
      <div
        className={classNames(
          "bg-default fixed right-0 z-20 flex h-screen w-80 flex-col space-y-2 overflow-x-hidden rounded-md px-2 pb-3 transition-transform",
          isSidebarOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        )}>
        <div className="flex flex-row items-center pt-5">
          <Button StartIcon={ArrowLeft} color="minimal" onClick={toggleSidebar} />
          <p className="-ml-2">Availability Settings</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                StartIcon={Trash}
                variant="icon"
                color="destructive"
                aria-label="Delete"
                className="ml-16 inline"
                disabled={isDeleteButtonDisabled}
                tooltip={isDeleteButtonDisabled ? "You are required to have at least one schedule" : "Delete"}
              />
            </DialogTrigger>
            <ConfirmationDialogContent
              isLoading={isDeleteDialogLoading}
              variety="danger"
              title="Delete schedule"
              confirmBtnText="Delete"
              loadingText="Delete"
              onConfirm={onDeleteConfirmation}>
              Deleting a schedule will remove it from all event types. This action cannot be undone.
            </ConfirmationDialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col px-2 py-2">
          <Skeleton as={Label}>Name</Skeleton>
          <Controller
            control={formControl}
            name="name"
            render={({ field }) => (
              <input
                className="hover:border-emphasis dark:focus:border-emphasis border-default bg-default placeholder:text-muted text-emphasis focus:ring-brand-default disabled:bg-subtle disabled:hover:border-subtle mb-2 block h-9 w-full rounded-md border px-3 py-2 text-sm leading-4 focus:border-neutral-300 focus:outline-none focus:ring-2 disabled:cursor-not-allowed"
                {...field}
              />
            )}
          />
        </div>
        {/* <div className="flex h-9 flex-row-reverse items-center justify-end gap-3 px-2">
          <Skeleton
            as={Label}
            htmlFor="hiddenSwitch"
            className="mt-2 cursor-pointer self-center pr-2 sm:inline">
            Set to Default
          </Skeleton>
          <Switch
            id="hiddenSwitch"
            disabled={isSwitchDisabled}
            checked={isSwitchChecked}
            onCheckedChange={onSwitchCheckedChange}
          />
        </div> */}
        <div className="min-w-40 col-span-3 space-y-2 px-2 py-4 lg:col-span-1">
          <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
            <div>
              <Skeleton as={Label} htmlFor="timeZone" className="mb-0 inline-block leading-none">
                Timezone
              </Skeleton>
              <Controller
                control={formControl}
                name="timeZone"
                render={({ field: { onChange, value } }) =>
                  value ? (
                    <TimezoneSelect
                      value={value}
                      className="focus:border-brand-default border-default mt-1 block w-72 rounded-md text-sm"
                      onChange={(timezone) => onChange(timezone.value)}
                    />
                  ) : (
                    <SelectSkeletonLoader className="mt-1 w-72" />
                  )
                }
              />
            </div>
            <hr className="border-subtle my-7" />
            <Troubleshooter isDisplayBlock={true} />
          </div>
          <hr />
        </div>
      </div>
    </div>
  );
}
