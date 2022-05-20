import { TrashIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { trpc } from "@calcom/web/lib/trpc";

import CheckboxField from "@components/ui/form/CheckboxField";

import RoutingShell from "../components/RoutingShell";

function Field({ field, updateField, deleteField, readonly = false }) {
  return (
    <div className="mt-10 flex justify-around">
      <div className="flex flex-col">
        <input
          type="text"
          value={field.text}
          onChange={(e) => {
            updateField({
              ...field,
              text: e.target.value,
            });
          }}
          placeholder="Write a field"></input>
        <CheckboxField label="Required Field"></CheckboxField>
      </div>
      <div>
        <Button
          StartIcon={TrashIcon}
          onClick={() => {
            deleteField();
          }}
          color="secondary">
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function FormBuilder({ subPage: formId }: { subPage: string }) {
  // TODO: Handle formId undefined in routing
  const { data: form, isLoading } = trpc.useQuery([
    "viewer.app_routing-forms.form",
    {
      id: +formId,
    },
  ]);
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.app_routing-forms.form", {
    onSettled() {
      utils.invalidateQueries(["viewer.app_routing-forms.form"]);
    },
  });

  const [formName, setFormName] = useState();

  if (!form) {
    return null;
  }
  if (!form.fields) {
    form.fields = [];
  }
  return (
    <RoutingShell formId={formId}>
      <div className="flex">
        <label>
          Form Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => {
              mutation.mutate({
                name: e.target.value,
              });
            }}></input>
        </label>
      </div>
      <div className="flex flex-col">
        {form.fields.map((field, key) => {
          return (
            <Field
              updateField={(field) => {
                const index = form.fields.findIndex((f) => f.id === field.id);
                const newFields = [...form.fields];
                newFields[index] = { ...newFields[index], ...field };
                mutation.mutate({
                  ...form,
                  fields: newFields,
                });
                return newFields;
              }}
              deleteField={() => {
                const newFields = form.fields.filter((q) => q.id !== field.id);
                mutation.mutate({
                  ...form,
                  fields: newFields,
                });
              }}
              key={key}
              field={field}></Field>
          );
        })}
        {!form.fields.length ? "No Fields" : null}
      </div>
      <Button
        className="flex"
        onClick={() => {
          const newFields = [
            ...form.fields,
            {
              // TODO: Should we give it a DB id?
              id: uuidv4(),
              // This is same type from react-awesome-query-builder
              type: "text",
              text: "Hello",
            },
          ];
          mutation.mutate({
            ...form,
            fields: newFields,
          });
        }}>
        Add Field
      </Button>
    </RoutingShell>
  );
}
