import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, UseFormReturn } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import Shell from "@calcom/features/shell/Shell";
import classNames from "@calcom/lib/classNames";
import {
  BooleanToggleGroupField,
  Button,
  EmptyScreen,
  FormCard,
  SelectField,
  TextAreaField,
  TextField,
} from "@calcom/ui";
import { FiPlus, FiFileText } from "@calcom/ui/components/icon";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
  RoutingFormWithResponseCount,
} from "../../components/SingleForm";

export { getServerSideProps };
type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

export const FieldTypes = [
  {
    label: "Short Text",
    value: "text",
  },
  {
    label: "Number",
    value: "number",
  },
  {
    label: "Long Text",
    value: "textarea",
  },
  {
    label: "Select",
    value: "select",
  },
  {
    label: "MultiSelect",
    value: "multiselect",
  },
  {
    label: "Phone",
    value: "phone",
  },
  {
    label: "Email",
    value: "email",
  },
];

function Field({
  hookForm,
  hookFieldNamespace,
  deleteField,
  fieldIndex,
  moveUp,
  moveDown,
  appUrl,
}: {
  fieldIndex: number;
  hookForm: HookForm;
  hookFieldNamespace: `fields.${number}`;
  deleteField: {
    check: () => boolean;
    fn: () => void;
  };
  moveUp: {
    check: () => boolean;
    fn: () => void;
  };
  moveDown: {
    check: () => boolean;
    fn: () => void;
  };
  appUrl: string;
}) {
  const [identifier, _setIdentifier] = useState(hookForm.getValues(`${hookFieldNamespace}.identifier`));

  const setUserChangedIdentifier = (val: string) => {
    _setIdentifier(val);
    // Also, update the form identifier so tha it can be persisted
    hookForm.setValue(`${hookFieldNamespace}.identifier`, val);
  };

  const label = hookForm.watch(`${hookFieldNamespace}.label`);

  useEffect(() => {
    if (!hookForm.getValues(`${hookFieldNamespace}.identifier`)) {
      _setIdentifier(label);
    }
  }, [label, hookFieldNamespace, hookForm]);
  const router = hookForm.getValues(`${hookFieldNamespace}.router`);
  const routerField = hookForm.getValues(`${hookFieldNamespace}.routerField`);
  return (
    <div
      data-testid="field"
      className="group mb-4 flex w-full items-center justify-between ltr:mr-2 rtl:ml-2">
      <FormCard
        label={label || `Field ${fieldIndex + 1}`}
        moveUp={moveUp}
        moveDown={moveDown}
        badge={
          router ? { text: router.name, variant: "gray", href: `${appUrl}/form-edit/${router.id}` } : null
        }
        deleteField={router ? null : deleteField}>
        <div className="w-full">
          <div className="mb-6 w-full">
            <TextField
              disabled={!!router}
              label="Label"
              type="text"
              placeholder="This is what your users would see"
              /**
               * This is a bit of a hack to make sure that for routerField, label is shown from there.
               * For other fields, value property is used because it exists and would take precedence
               */
              defaultValue={routerField?.label}
              required
              {...hookForm.register(`${hookFieldNamespace}.label`)}
              className="block w-full rounded-sm border-gray-300 text-sm"
            />
          </div>
          <div className="mb-6 w-full">
            <TextField
              disabled={!!router}
              label="Identifier"
              name="identifier"
              required
              placeholder="Identifies field by this name."
              value={identifier}
              defaultValue={routerField?.identifier || routerField?.label}
              onChange={(e) => setUserChangedIdentifier(e.target.value)}
              className="block w-full rounded-sm border-gray-300 text-sm"
            />
          </div>
          <div className="mb-6 w-full ">
            <Controller
              name={`${hookFieldNamespace}.type`}
              control={hookForm.control}
              defaultValue={routerField?.type}
              render={({ field: { value, onChange } }) => {
                const defaultValue = FieldTypes.find((fieldType) => fieldType.value === value);
                return (
                  <SelectField
                    label="Type"
                    isDisabled={!!router}
                    containerClassName="data-testid-field-type"
                    options={FieldTypes}
                    onChange={(option) => {
                      if (!option) {
                        return;
                      }
                      onChange(option.value);
                    }}
                    defaultValue={defaultValue}
                  />
                );
              }}
            />
          </div>
          {["select", "multiselect"].includes(hookForm.watch(`${hookFieldNamespace}.type`)) ? (
            <div className="mt-2 block items-center sm:flex">
              <div className="w-full">
                <TextAreaField
                  disabled={!!router}
                  rows={3}
                  label="Options"
                  defaultValue={routerField?.selectText}
                  placeholder="Add 1 option per line"
                  {...hookForm.register(`${hookFieldNamespace}.selectText`)}
                />
              </div>
            </div>
          ) : null}

          <div className="w-full">
            <Controller
              name={`${hookFieldNamespace}.required`}
              control={hookForm.control}
              defaultValue={routerField?.required}
              render={({ field: { value, onChange } }) => {
                return (
                  <BooleanToggleGroupField
                    disabled={!!router}
                    label="Required"
                    value={value}
                    onValueChange={onChange}
                  />
                );
              }}
            />
          </div>
        </div>
      </FormCard>
    </div>
  );
}

const FormEdit = ({
  hookForm,
  form,
  appUrl,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
  appUrl: string;
}) => {
  const fieldsNamespace = "fields";
  const {
    fields: hookFormFields,
    append: appendHookFormField,
    remove: removeHookFormField,
    swap: swapHookFormField,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore https://github.com/react-hook-form/react-hook-form/issues/6679
  } = useFieldArray({
    control: hookForm.control,
    name: fieldsNamespace,
  });

  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const addField = () => {
    appendHookFormField({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      id: uuidv4(),
      // This is same type from react-awesome-query-builder
      type: "text",
      label: "",
    });
  };

  // hookForm.reset(form);
  if (!form.fields) {
    form.fields = [];
  }
  return hookFormFields.length ? (
    <div className="flex flex-col-reverse lg:flex-row">
      <div className="w-full ltr:mr-2 rtl:ml-2">
        <div ref={animationRef} className="flex w-full flex-col">
          {hookFormFields.map((field, key) => {
            return (
              <Field
                appUrl={appUrl}
                fieldIndex={key}
                hookForm={hookForm}
                hookFieldNamespace={`${fieldsNamespace}.${key}`}
                deleteField={{
                  check: () => hookFormFields.length > 1,
                  fn: () => {
                    removeHookFormField(key);
                  },
                }}
                moveUp={{
                  check: () => key !== 0,
                  fn: () => {
                    swapHookFormField(key, key - 1);
                  },
                }}
                moveDown={{
                  check: () => key !== hookFormFields.length - 1,
                  fn: () => {
                    if (key === hookFormFields.length - 1) {
                      return;
                    }
                    swapHookFormField(key, key + 1);
                  },
                }}
                key={key}
              />
            );
          })}
        </div>
        {hookFormFields.length ? (
          <div className={classNames("flex")}>
            <Button
              data-testid="add-field"
              type="button"
              StartIcon={FiPlus}
              color="secondary"
              onClick={addField}>
              Add Field
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : (
    <div className="w-full">
      <EmptyScreen
        Icon={FiFileText}
        headline="Create your first field"
        description="Fields are the form fields that the booker would see."
        buttonRaw={
          <Button data-testid="add-field" onClick={addField}>
            Create Field
          </Button>
        }
      />
    </div>
  );
};

export default function FormEditPage({
  form,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
    />
  );
}

FormEditPage.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
      {page}
    </Shell>
  );
};
