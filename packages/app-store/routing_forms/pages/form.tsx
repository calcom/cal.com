import { TrashIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { withQuery } from "@calcom/lib/QueryCell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button, Select, BooleanToggleGroup } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";

import RoutingNavBar from "../components/RoutingNavBar";
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
];

function Field({ field, hookForm, hookFieldNamespace, deleteField, moveUp, moveDown, readonly = false }) {
  return (
    <div className="group mb-4 flex w-full items-center justify-between hover:bg-neutral-50 ltr:mr-2 rtl:ml-2">
      <button
        type="button"
        className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
        onClick={() => moveUp()}>
        <ArrowUpIcon />
      </button>
      <button
        type="button"
        className="invisible absolute left-1/2 mt-8 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
        onClick={() => moveDown()}>
        <ArrowDownIcon />
      </button>
      <div className="-mx-4 flex flex-1 items-center rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
        <div className="w-full">
          <div className="mt-2 block items-start sm:flex">
            <div className="min-w-48 mb-4 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                Label
              </label>
            </div>
            <div className="w-full">
              <input
                type="text"
                {...hookForm.register(`${hookFieldNamespace}.label`)}
                className="block w-full rounded-sm border-gray-300 text-sm"
              />
            </div>
          </div>
          <div className="mt-2 block items-center sm:flex">
            <div className="min-w-48 mb-4  sm:mb-0">
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
        <button
          className="float-right ml-5"
          onClick={() => {
            deleteField();
          }}
          color="secondary">
          <TrashIcon className="h-4 w-4 text-gray-400"></TrashIcon>
        </button>
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
                        deleteField={() => {
                          removeHookFormField(key);
                        }}
                        moveUp={() => {
                          if (key === 0) {
                            return;
                          }
                          swapHookFormField(key, key - 1);
                        }}
                        moveDown={() => {
                          if (key === hookFormFields.length - 1) {
                            return;
                          }
                          swapHookFormField(key, key + 1);
                        }}
                        key={key}
                        field={field}></Field>
                    );
                  })}
                </div>
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
                      label: "Hello",
                    });
                  }}>
                  Add Attribute
                </Button>
                <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button
                    href="/event-types"
                    onClick={() => {
                      router.push("/apps/routing_forms/forms");
                    }}
                    color="secondary"
                    tabIndex={-1}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={mutation.isLoading}>
                    {t("update")}
                  </Button>
                </div>
              </Form>
              <SideBar form={form} />
            </div>
          </RoutingShell>
        );
      }}></WithQuery>
  );
}
