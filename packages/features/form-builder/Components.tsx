import { useEffect } from "react";
import { z } from "zod";

import Widgets, {
  ComponentProps,
} from "@calcom/app-store/ee/routing-forms/components/react-awesome-query-builder/widgets";
import { PhoneInput, AddressInput } from "@calcom/ui";

import { ComponentForField } from "./FormBuilder";
import { fieldsSchema } from "./FormBuilderFieldsSchema";

export const Components = {
  text: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.TextWidget {...props} />,
  },
  textarea: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.TextAreaWidget {...props} />,
  },
  number: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.NumberWidget {...props} />,
  },
  multiselect: {
    propsType: "select",
    factory: (
      props: ComponentProps & {
        listValues: { title: string; value: string }[];
      }
    ) => <Widgets.MultiSelectWidget {...props} />,
  },
  select: {
    propsType: "select",
    factory: (
      props: ComponentProps & {
        listValues: { title: string; value: string }[];
      }
    ) => <Widgets.SelectWidget {...props} />,
  },
  phone: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      if (!props) {
        return <div />;
      }

      return (
        <PhoneInput
          onChange={(val: string) => {
            props.setValue(val);
          }}
          {...props}
        />
      );
    },
    valuePlaceholder: "Enter Phone Number",
  },
  email: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      if (!props) {
        return <div />;
      }
      // FIXME: type=email is removed so that RHF validations can work
      // But, RHF errors are not integrated in Routing Forms form
      return <Widgets.TextWidget {...props} />;
    },
  },
  multiemail: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      //TODO: ManageBookings: Make it use multiemail
      return <Widgets.TextWidget type="email" {...props} />;
    },
    valuePlaceholder: "Enter Email Addresses",
  },
  address: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      return (
        <AddressInput
          onChange={(val) => {
            props.setValue(val);
          }}
          {...props}
        />
      );
    },
  },
  radioInput: {
    propsType: "objectiveWithInput",
    factory: function RadioInputWithLabel({
      name,
      options,
      optionsInputs,
      value,
      setValue,
      readOnly,
    }: Omit<ComponentProps, "setValue" | "value"> & {
      options: { label: string; value: string }[];
      optionsInputs: NonNullable<z.infer<typeof fieldsSchema>[number]["optionsInputs"]>;
      value: { value: string; optionValue: string };
      setValue: (val: { value: string; optionValue: string }) => void;
      name?: string;
    }) {
      useEffect(() => {
        setValue({
          value: options[0]?.value,
          optionValue: "",
        });
      }, []);
      // const getLocationInputField = () => {
      //   return (
      //     <div className="mb-4">
      //       {/* <Label>
      //       </Label> */}
      //       {Field ? (
      //         <div>
      //           <div className="mt-1">{Field}</div>
      //           {bookingForm.formState.errors.phone && (
      //             <div className="mt-2 flex items-center text-sm text-red-700 ">
      //               <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
      //               <p>{t("invalid_number")}</p>
      //             </div>
      //           )}
      //         </div>
      //       ) : null}
      //     </div>
      //   );
      // };

      return (
        <div>
          <div>
            <div
              className="mb-4"
              onChange={(e) => {
                setValue({
                  // TODO: ManageBookings: onChange fires on parent of radio inputs but onChange isn't allowed to have a value for div in TS
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  value: e.target.value || "",
                  optionValue: "",
                });
              }}>
              {options.length > 1 ? (
                options.map((option, i) => {
                  return (
                    <label key={i} className="block">
                      <input
                        type="radio"
                        disabled={readOnly}
                        name={name}
                        // disabled={!!disableLocations}
                        //TODO: ManageBookings: What does this location class do?
                        className="location dark:bg-darkgray-300 dark:border-darkgray-300 h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                        value={option.value}
                        defaultChecked={option.value === value?.value}
                      />
                      <span className="text-sm ltr:ml-2 ltr:mr-2 rtl:ml-2 dark:text-white">
                        {option.label ?? ""}
                      </span>
                    </label>
                  );
                })
              ) : (
                <span className="text-sm">{options[0].label}</span>
              )}
            </div>
          </div>
          {(() => {
            const optionField = optionsInputs[value?.value];
            if (!optionField) {
              return null;
            }
            return (
              <div>
                <ComponentForField
                  readOnly
                  field={optionField}
                  value={value?.optionValue}
                  setValue={(val: string) => {
                    setValue({
                      value: value?.value,
                      optionValue: val,
                    });
                  }}
                />
              </div>
            );
          })()}
        </div>
      );
    },
  },
} as const;
