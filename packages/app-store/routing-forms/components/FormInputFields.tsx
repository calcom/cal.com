import type { App_RoutingForms_Form } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import { getQueryBuilderConfig } from "../lib/getQueryBuilderConfig";
import isRouterLinkedField from "../lib/isRouterLinkedField";
import { getUIOptionsForSelect } from "../lib/selectOptions";
import { getFieldResponseForJsonLogic } from "../lib/transformResponse";
import type { SerializableForm, FormResponse } from "../types/types";

type Props = {
  form: SerializableForm<App_RoutingForms_Form>;
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
};

export default function FormInputFields(props: Props) {
  const { form, response, setResponse } = props;

  const queryBuilderConfig = getQueryBuilderConfig(form);

  return (
    <>
      {form.fields?.map((field) => {
        if (isRouterLinkedField(field)) {
          // @ts-expect-error FIXME @hariombalhara
          field = field.routerField;
        }
        const widget = queryBuilderConfig.widgets[field.type];
        if (!("factory" in widget)) {
          return null;
        }
        const Component = widget.factory;

        const options = getUIOptionsForSelect(field);
        return (
          <div key={field.id} className="mb-4 block flex-col sm:flex ">
            <div className="min-w-48 mb-2 flex-grow">
              <label id="slug-label" htmlFor="slug" className="text-default flex text-sm font-medium">
                {field.label}
              </label>
            </div>
            <Component
              value={response[field.id]?.value ?? ""}
              placeholder={field.placeholder ?? ""}
              // required property isn't accepted by query-builder types
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              /* @ts-ignore */
              required={!!field.required}
              listValues={options}
              data-testid={`form-field-${getFieldIdentifier(field)}`}
              setValue={(value: number | string | string[]) => {
                setResponse((response) => {
                  response = response || {};
                  return {
                    ...response,
                    [field.id]: {
                      label: field.label,
                      value: getFieldResponseForJsonLogic({ field, value }),
                    },
                  };
                });
              }}
            />
          </div>
        );
      })}
    </>
  );
}
