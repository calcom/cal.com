import { Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { SettingsToggle, TextField, CheckboxField, Alert } from "@calcom/ui";

type OfferSeatsPerTimeSlotProps = {
  seatsLocked: {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  isNoShowFeeEnabled: boolean;
  enableRequiresConfirmation: () => void;
  disableRequiresConfirmation: () => void;
};

export function OfferSeatsPerTimeSlot({
  seatsLocked,
  isNoShowFeeEnabled,
  enableRequiresConfirmation,
  disableRequiresConfirmation,
}: OfferSeatsPerTimeSlotProps) {
  return (
    <Controller
      name="seatsPerTimeSlotEnabled"
      render={({ field: { value, onChange } }) => (
        <>
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              value && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            data-testid="offer-seats-toggle"
            title="Offer seats"
            {...seatsLocked}
            description="Offer seats for booking. This automatically disables guest & opt-in bookings."
            checked={value}
            disabled={isNoShowFeeEnabled}
            onCheckedChange={(e) => {
              if (e) {
                enableRequiresConfirmation();
              } else {
                disableRequiresConfirmation();
              }
              onChange(e);
            }}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <Controller
                name="seatsPerTimeSlot"
                render={({ field: { value, onChange } }) => (
                  <div>
                    <TextField
                      required
                      name="seatsPerTimeSlot"
                      labelSrOnly
                      label="Number of seats per booking"
                      type="number"
                      disabled={seatsLocked.disabled}
                      defaultValue={value}
                      min={1}
                      containerClassName="max-w-80"
                      addOnSuffix={<>seats</>}
                      onChange={(e) => {
                        onChange(Math.abs(Number(e.target.value)));
                      }}
                      data-testid="seats-per-time-slot"
                    />
                  </div>
                )}
              />
              <div className="mt-4">
                <Controller
                  name="seatsShowAttendees"
                  render={({ field: { value, onChange } }) => (
                    <CheckboxField
                      data-testid="show-attendees"
                      description="Share attendee information between guests"
                      disabled={seatsLocked.disabled}
                      onChange={(e) => onChange(e)}
                      checked={value}
                    />
                  )}
                />
              </div>
              <div className="mt-2">
                <Controller
                  name="seatsShowAvailabilityCount"
                  render={({ field: { value, onChange } }) => (
                    <CheckboxField
                      description="Show the number of available seats"
                      disabled={seatsLocked.disabled}
                      onChange={(e) => onChange(e)}
                      checked={value}
                    />
                  )}
                />
              </div>
            </div>
          </SettingsToggle>
          {isNoShowFeeEnabled && (
            <Alert severity="warning" title="Currently cannot enable seats and charge a no-show fee" />
          )}
        </>
      )}
    />
  );
}
