import { TrashIcon, PlusIcon, ArrowUpIcon, CollectionIcon, ArrowDownIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useForm, UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import { Button, Select, BooleanToggleGroup, EmptyScreen } from "@calcom/ui";
import { Form, TextArea } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import PencilEdit from "@components/PencilEdit";

import RoutingShell from "../../components/RoutingShell";
import SideBar from "../../components/SideBar";
import { getSerializableForm } from "../../utils";

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
  moveUp,
  moveDown,
}: {
  hookForm: UseFormReturn<inferSSRProps<typeof getServerSideProps>["form"]>;
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
      className="group mb-4 flex w-full items-center justify-between hover:bg-neutral-50 ltr:mr-2 rtl:ml-2">
      {moveUp.check() ? (
        <button
          type="button"
          className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
          onClick={() => moveUp.fn()}>
          <ArrowUpIcon />
        </button>
      ) : null}

      {moveDown.check() ? (
        <button
          type="button"
          className="invisible absolute left-1/2 mt-8 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[19px] sm:ml-0 sm:block"
          onClick={() => moveDown.fn()}>
          <ArrowDownIcon />
        </button>
      ) : null}
      <div className="-mx-4 flex flex-1 items-center rounded-sm border border-neutral-200 bg-white p-4 sm:mx-0">
        <div className="w-full">
          <div className="mt-2 block items-center sm:flex">
            <div className="min-w-48 mb-4 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                Label
              </label>
            </div>
            <div className="w-full">
              <input
                type="text"
                placeholder="This is what your users would see"
                required
                {...hookForm.register(`${hookFieldNamespace}.label`)}
                className="block w-full rounded-sm border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="mt-2 block items-center sm:flex">
            <div className="min-w-48 mb-4 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                Nickname
              </label>
            </div>
            <div className="w-full">
              <input
                type="text"
                required
                placeholder="Identifies field in webhook payloads"
                value={identifier}
                onChange={(e) => setUserChangedIdentifier(e.target.value)}
                className="block w-full rounded-sm border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="mt-2 block items-center sm:flex">
            <div className="min-w-48 mb-4 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                Type
              </label>
            </div>
            <div className="w-full">
              <Controller
                name={`${hookFieldNamespace}.type`}
                control={hookForm.control}
                render={({ field: { value, onChange } }) => {
                  const defaultValue = FieldTypes.find((fieldType) => fieldType.value === value);
                  return (
                    <Select
                      className="data-testid-field-type"
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
          </div>
          {["select", "multiselect"].includes(hookForm.watch(`${hookFieldNamespace}.type`)) ? (
            <div className="mt-2 block items-center sm:flex">
              <div className="min-w-48 mb-4 sm:mb-0">
                <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                  Options
                </label>
              </div>

              <div className="w-full">
                <TextArea
                  placeholder="Add 1 option per line"
                  {...hookForm.register(`${hookFieldNamespace}.selectText`)}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-2 block items-center sm:flex">
            <div className="min-w-48 mb-4 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                Required
              </label>
            </div>
            <div className="w-full">
              <Controller
                name={`${hookFieldNamespace}.required`}
                control={hookForm.control}
                render={({ field: { value, onChange } }) => {
                  return <BooleanToggleGroup value={value} onValueChange={onChange} />;
                }}
              />
            </div>
          </div>
        </div>
        {deleteField.check() ? (
          <button
            className="float-right ml-5"
            onClick={() => {
              deleteField.fn();
            }}
            color="secondary">
            <TrashIcon className="h-4 w-4 text-gray-400" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function FormEdit({
  form,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onError() {
      showToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.invalidateQueries([
        "viewer.app_routing_forms.form",
        {
          id: form.id,
        },
      ]);
    },
    onSuccess() {
      showToast(`Form updated successfully.`, "success");
      router.replace(router.asPath);
    },
  });

  const fieldsNamespace = "fields";
  const hookForm = useForm({
    defaultValues: form,
  });

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

  // hookForm.reset(form);
  if (!form.fields) {
    form.fields = [];
  }
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

  return (
    <RoutingShell
      form={form}
      appUrl={appUrl}
      heading={
        <PencilEdit
          value={
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            hookForm.watch("name")
          }
          onChange={(value) => {
            hookForm.setValue("name", value);
          }}
        />
      }>
      {hookFormFields.length ? (
        <div className="flex flex-col-reverse lg:flex-row">
          <Form
            className="w-full max-w-4xl ltr:mr-2 rtl:ml-2 md:w-9/12"
            form={hookForm}
            handleSubmit={(data) => {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-ignore
              mutation.mutate({
                ...data,
              });
            }}>
            <div className="mb-5">
              <h3 className="mb-2 text-base font-medium leading-6 text-gray-900">Description</h3>
              <div className="w-full">
                <textarea
                  id="description"
                  data-testid="description"
                  className="block w-full rounded-sm border-gray-300 text-sm "
                  placeholder="Form Description"
                  {...hookForm.register("description")}
                  defaultValue={form.description || ""}
                />
              </div>
            </div>
            <hr className="mb-5 border-neutral-200" />
            <h3 className="mb-2 text-base font-medium leading-6 text-gray-900">Fields</h3>
            <div className="flex flex-col">
              {hookFormFields.map((field, key) => {
                return (
                  <Field
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
                  StartIcon={PlusIcon}
                  color="secondary"
                  onClick={addField}>
                  Add Field
                </Button>
              </div>
            ) : null}
            {hookFormFields.length ? (
              <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                <Button href="/apps/routing_forms/forms" color="secondary" tabIndex={-1}>
                  {t("cancel")}
                </Button>
                <Button type="submit" data-testid="update-form" disabled={mutation.isLoading}>
                  {t("update")}
                </Button>
              </div>
            ) : null}
          </Form>
          <SideBar form={form} appUrl={appUrl} />
        </div>
      ) : (
        <button data-testid="add-field" onClick={addField} className="w-full">
          <EmptyScreen
            Icon={CollectionIcon}
            headline="Create your first field"
            description="Fields are the form fields that the booker would see."
            button={<Button>Create Field</Button>}
          />
        </button>
      )}
    </RoutingShell>
  );
}

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
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
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
