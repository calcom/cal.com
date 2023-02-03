import { UseFormReturn } from "react-hook-form";
import { Props } from "react-phone-number-input/react-hook-form";

import { EventLocationType } from "@calcom/app-store/locations";

import { FiMapPin } from "../components/icon";

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: EventLocationType["type"];
  guests?: { email: string }[];
  address?: string;
  attendeeAddress?: string;
  phone?: string;
  hostPhoneNumber?: string; // Maybe come up with a better way to name this to distingish between two types of phone numbers
  customInputs?: {
    [key: string]: string | boolean;
  };
  rescheduleReason?: string;
  smsReminderNumber?: string;
};

export type AddressInputProps<FormValues> = Props<
  {
    value: string;
    id: string;
    placeholder: string;
    required: boolean;
    bookingForm: UseFormReturn<BookingFormValues>;
  },
  FormValues
>;

function AddressInput<FormValues>({ bookingForm, name, className, ...rest }: AddressInputProps<FormValues>) {
  return (
    <div className="relative ">
      <FiMapPin color="#D2D2D2" className="absolute top-1/2 left-0.5 ml-3 h-6 -translate-y-1/2" />
      <input
        {...rest}
        {...bookingForm.register("attendeeAddress")}
        name={name}
        color="#D2D2D2"
        className={`${className} focus-within:border-brand dark:bg-darkgray-100 dark:border-darkgray-300 block h-10 w-full rounded-md border  border border-gray-300 py-px pl-10 text-sm outline-none ring-black focus-within:ring-1 disabled:text-gray-500 disabled:opacity-50 dark:text-white dark:placeholder-gray-500 dark:selection:bg-green-500 disabled:dark:text-gray-500`}
      />
    </div>
  );
}

export default AddressInput;
