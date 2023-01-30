import { useEffect } from "react";
import { ReactMultiEmail } from "react-multi-email";
import { z } from "zod";

import Widgets, {
  TextLikeComponentProps,
  SelectLikeComponentProps,
} from "@calcom/app-store/ee/routing-forms/components/react-awesome-query-builder/widgets";
import { PhoneInput, AddressInput, Label, Group, RadioField } from "@calcom/ui";

import { ComponentForField } from "./FormBuilder";
import { fieldsSchema } from "./FormBuilderFieldsSchema";

export const Components = {
  text: {
    propsType: "text",
    type: "text",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => <Widgets.TextWidget {...props} />,
  },
  textarea: {
    propsType: "text",
    type: "textarea",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => <Widgets.TextAreaWidget {...props} />,
  },
  number: {
    propsType: "text",

    type: "number",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => <Widgets.NumberWidget {...props} />,
  },
  phone: {
    propsType: "text",
    type: "phone",
    factory: <TProps extends TextLikeComponentProps>({ setValue, ...props }: TProps) => {
      if (!props) {
        return <div />;
      }

      return (
        <PhoneInput
          onChange={(val: string) => {
            setValue(val);
          }}
          {...props}
        />
      );
    },
    valuePlaceholder: "Enter Phone Number",
  },
  email: {
    type: "email",
    propsType: "text",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => {
      if (!props) {
        return <div />;
      }
      // FIXME: type=email is removed so that RHF validations can work
      // But, RHF errors are not integrated in Routing Forms form
      return <Widgets.TextWidget {...props} />;
    },
  },
  address: {
    type: "address",
    propsType: "text",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => {
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
  multiemail: {
    type: "multiemail",
    propsType: "text",
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => {
      //TODO: ManageBookings: Make it use multiemail
      return <Widgets.TextWidget type="email" {...props} />;
    },
    valuePlaceholder: "Enter Email Addresses",
  },
  multiselect: {
    type: "multiselect",
    propsType: "multiselect",
    factory: <TProps extends SelectLikeComponentProps<string[]>>(props: TProps) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.MultiSelectWidget {...newProps} />;
    },
  },
  select: {
    type: "select",
    propsType: "select",
    factory: <TProps extends SelectLikeComponentProps>(props: TProps) => {
      const newProps = {
        ...props,
        listValues: props.options.map((o) => ({ title: o.label, value: o.value })),
      };
      return <Widgets.SelectWidget {...newProps} />;
    },
  },
  checkbox: {
    type: "checkbox",
    propsType: "multiselect",
    factory: <TProps extends SelectLikeComponentProps<string[]>>({
      options,
      readOnly,
      setValue,
      value,
    }: TProps) => {
      return (
        <div>
          {options.map((option, i) => {
            return (
              <label key={i} className="block">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  onChange={(e) => {
                    const newValue = value.filter((v) => v !== option.value);
                    if (e.target.checked) {
                      newValue.push(option.value);
                    }
                    setValue(newValue);
                  }}
                  // disabled={!!disableLocations}
                  //TODO: ManageBookings: What does this location class do?
                  className="location dark:bg-darkgray-300 dark:border-darkgray-300 h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                  value={option.value}
                  checked={value.includes(option.value)}
                />
                <span className="text-sm ltr:ml-2 ltr:mr-2 rtl:ml-2 dark:text-white">
                  {option.label ?? ""}
                </span>
              </label>
            );
          })}
        </div>
      );
    },
  },
  radio: {
    type: "radio",
    propsType: "select",
    factory: <TProps extends SelectLikeComponentProps>({ setValue, value, options }: TProps) => {
      return (
        <Group
          value={value}
          onValueChange={(e) => {
            setValue(e);
          }}>
          <>
            {options.map((option, i) => (
              <RadioField
                label={option.label}
                key={`option.${i}.radio`}
                value={option.label}
                id={`option.${i}.radio`}
              />
            ))}
          </>
        </Group>
      );
    },
  },
  radioInput: {
    type: "radioInput",
    propsType: "objectiveWithInput",
    factory: function RadioInputWithLabel<
      TProps extends SelectLikeComponentProps<{
        value: string;
        optionValue: string;
      }> & {
        optionsInputs: NonNullable<z.infer<typeof fieldsSchema>[number]["optionsInputs"]>;
        value: { value: string; optionValue: string };
      } & {
        name?: string;
      }
    >({ name, options, optionsInputs, value, setValue, readOnly }: TProps) {
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
  boolean: {
    type: "boolean",
    propsType: "boolean",
    factory: <TProps extends TextLikeComponentProps<boolean>>({
      readOnly,
      label,
      value,
      setValue,
    }: TProps) => {
      return (
        <div className="flex">
          <input
            type="checkbox"
            onChange={(e) => {
              if (e.target.checked) {
                setValue(true);
              } else {
                setValue(false);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:bg-gray-200 ltr:mr-2 rtl:ml-2 disabled:dark:text-gray-500"
            placeholder=""
            checked={value}
            disabled={readOnly}
          />
          <Label className="-mt-px block text-sm font-medium text-gray-700 dark:text-white">{label}</Label>
        </div>
      );
    },
  },
} as const;
