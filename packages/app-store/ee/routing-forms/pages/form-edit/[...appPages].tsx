import autoAnimate from "@formkit/auto-animate";
import { App_RoutingForms_Form } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { UseFormReturn } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import classNames from "@calcom/lib/classNames";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import { Icon } from "@calcom/ui";
import { Button, EmptyScreen, SelectField, TextAreaField, TextField, Shell } from "@calcom/ui/v2";
import { BooleanToggleGroupField } from "@calcom/ui/v2/core/form/BooleanToggleGroup";
import FormCard from "@calcom/ui/v2/core/form/FormCard";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "../../components/SingleForm";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { SerializableForm } from "../../types/types";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;
type RoutingFormWithResponseCount = RoutingForm & {
  _count: {
    responses: number;
  };
};
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

  return (
    <div
      data-testid="field"
      className="group mb-4 flex w-full items-center justify-between ltr:mr-2 rtl:ml-2">
      <FormCard
        label={label || `Field ${fieldIndex + 1}`}
        moveUp={moveUp}
        moveDown={moveDown}
        deleteField={deleteField}>
        <div className="w-full">
          <div className="mb-6 w-full">
            <TextField
              label="Label"
              type="text"
              placeholder="This is what your users would see"
              required
              {...hookForm.register(`${hookFieldNamespace}.label`)}
              className="block w-full rounded-sm border-gray-300 text-sm"
            />
          </div>
          <div className="mb-6 w-full">
            <TextField
              label="Identifier"
              name="identifier"
              required
              placeholder="Identifies field by this name."
              value={identifier}
              onChange={(e) => setUserChangedIdentifier(e.target.value)}
              className="block w-full rounded-sm border-gray-300 text-sm"
            />
          </div>
          <div className="mb-6 w-full ">
            <Controller
              name={`${hookFieldNamespace}.type`}
              control={hookForm.control}
              render={({ field: { value, onChange } }) => {
                const defaultValue = FieldTypes.find((fieldType) => fieldType.value === value);
                return (
                  <SelectField
                    label="Type"
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
                  rows={3}
                  label="Options"
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
              render={({ field: { value, onChange } }) => {
                return <BooleanToggleGroupField label="Required" value={value} onValueChange={onChange} />;
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
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
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

  const animationRef = useRef(null);

  useEffect(() => {
    animationRef.current && autoAnimate(animationRef.current);
  }, [animationRef]);

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
              StartIcon={Icon.FiPlus}
              color="secondary"
              onClick={addField}>
              Add Field
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : (
    <button data-testid="add-field" onClick={addField} className="w-full">
      <EmptyScreen
        Icon={Icon.FiFileText}
        headline="Create your first field"
        description="Fields are the form fields that the booker would see."
        buttonRaw={<Button>Create Field</Button>}
      />
    </button>
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
      Page={({ hookForm, form }) => <FormEdit hookForm={hookForm} form={form} />}
    />
  );
}

FormEditPage.getLayout = (page: React.ReactElement) => {
  return <Shell withoutMain={true}>{page}</Shell>;
};

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) {
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    return {
      notFound: true,
    };
  }
  const isAllowed = (await import("../../lib/isAllowed")).isAllowed;
  if (!(await isAllowed({ userId: user.id, formId }))) {
    return {
      notFound: true,
    };
  }

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  if (!form) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      form: getSerializableForm(form),
    },
  };
};
