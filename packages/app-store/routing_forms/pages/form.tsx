import { TrashIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { withQuery } from "@calcom/lib/QueryCell";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button, Select, BooleanToggleGroup } from "@calcom/ui";
import { Form, TextArea } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";

import RoutingShell from "../components/RoutingShell";
import SideBar from "../components/SideBar";

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

function Field({ hookForm, hookFieldNamespace, deleteField, moveUp, moveDown, readonly = false }) {
  return (
    <div className="group mb-4 flex w-full items-center justify-between hover:bg-neutral-50 ltr:mr-2 rtl:ml-2">
      {moveUp.check() ? (
        <button
          type="button"
          className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
          onClick={() => moveUp.fn()}>
          <ArrowUpIcon />
        </button>
      ) : null}

      {moveDown.check() ? (
        <button
          type="button"
          className="invisible absolute left-1/2 mt-8 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
          onClick={() => moveDown.fn()}>
          <ArrowDownIcon />
        </button>
      ) : null}
      <div className="-mx-4 flex flex-1 items-center rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
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
                required
                {...hookForm.register(`${hookFieldNamespace}.label`)}
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
                      options={FieldTypes}
                      onChange={(option) => {
                        onChange(option.value);
                      }}
                      defaultValue={defaultValue}></Select>
                  );
                }}></Controller>
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
                <TextArea {...hookForm.register(`${hookFieldNamespace}.selectText`)} />
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
                  return <BooleanToggleGroup value={value} onValueChange={onChange}></BooleanToggleGroup>;
                }}></Controller>
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
            <TrashIcon className="h-4 w-4 text-gray-400"></TrashIcon>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function FormBuilder({ subPages, Page404 }: { subPages: string[] }) {
  const router = useRouter();
  const formId = subPages[0];
  const { t } = useLocale();
  if (subPages.length > 1) {
    return <Page404 />;
  }

  const WithQuery = withQuery([
    "viewer.app_routing_forms.form",
    {
      id: formId,
    },
  ]);

  return (
    <WithQuery
      success={function RoutingForm(props) {
        const utils = trpc.useContext();

        const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
          onError() {
            showToast(`Something went wrong`, "error");
          },
          onSettled() {
            utils.invalidateQueries(["viewer.app_routing_forms.form"]);
          },
          onSuccess(data) {
            showToast(`Form updated`, "success");
          },
        });
        const form = props.data;
        const fieldsNamespace = "fields";
        const hookForm = useForm({
          defaultValues: form,
        });

        const {
          fields: hookFormFields,
          append: appendHookFormField,
          remove: removeHookFormField,
          swap: swapHookFormField,
        } = useFieldArray({
          control: hookForm.control,
          name: fieldsNamespace,
        });

        // hookForm.reset(form);
        if (!form.fields) {
          form.fields = [];
        }
        return (
          <RoutingShell
            form={form}
            heading={
              <PencilEdit
                value={form.name}
                onChange={(value) => {
                  mutation.mutate({
                    ...form,
                    name: value,
                  });
                }}></PencilEdit>
            }>
            <div className="flex">
              <Form
                className="w-4/6"
                form={hookForm}
                handleSubmit={(data) => {
                  mutation.mutate({
                    ...data,
                  });
                }}>
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
                        field={field}></Field>
                    );
                  })}
                </div>
                <div className={classNames("flex", !hookFormFields.length ? "justify-center" : "")}>
                  <Button
                    type="button"
                    StartIcon={PlusIcon}
                    color="secondary"
                    onClick={() => {
                      appendHookFormField({
                        // TODO: Should we give it a DB id?
                        id: uuidv4(),
                        // This is same type from react-awesome-query-builder
                        type: "text",
                        label: "",
                      });
                    }}>
                    Add Attribute
                  </Button>
                </div>
                {hookFormFields.length ? (
                  <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                    <Button href="/apps/routing_forms/forms" color="secondary" tabIndex={-1}>
                      {t("cancel")}
                    </Button>
                    <Button type="submit" disabled={mutation.isLoading}>
                      {t("update")}
                    </Button>
                  </div>
                ) : null}
              </Form>
              <SideBar form={form} />
            </div>
          </RoutingShell>
        );
      }}></WithQuery>
  );
}
