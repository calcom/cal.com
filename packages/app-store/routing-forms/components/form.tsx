import jsonLogic from "json-logic-js";
import { useRouter } from "next/router";
import { useState } from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@calcom/ui";
import { Form, Label } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import { getQueryBuilderConfig } from "../pages/routing";

export default function RoutingForm({ formId, onSubmit = null }) {
  const { isLoading, data: form } = trpc.useQuery([
    "viewer.app_routing-forms.form",
    {
      id: formId,
    },
  ]);

  const router = useRouter();
  onSubmit =
    onSubmit ||
    ((response) => {
      const decidedAction = processRoute({ form, response });
      if (decidedAction.type === "customPageMessage") {
        alert(decidedAction.value);
      } else if (decidedAction.type === "eventTypeRedirectUrl") {
        router.push(`/${decidedAction.value}`);
      } else if (decidedAction.type === "externalRedirectUrl") {
        window.location.href = decidedAction.value;
      }
      responseMutation.mutate({
        formId,
        formFillerId: uuidv4(),
        response: response,
      });
    });

  const responseMutation = trpc.useMutation("viewer.app_routing-forms.response");

  const [_response, setResponse] = useState({});

  if (!form) {
    return null;
  }

  const response = {};

  form.fields.forEach((field) => {
    response[field.id] = _response[field.id] || "";
  });

  const queryBuilderConfig = getQueryBuilderConfig(form);

  const handleOnSubmit = (e) => {
    e.preventDefault();
    onSubmit(response);
  };

  return (
    <div className="transition-max-width mx-auto my-0 max-w-3xl duration-500 ease-in-out md:mb-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
          <form onSubmit={handleOnSubmit}>
            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              {form.name}
            </h1>
            {form.fields.map((field) => {
              const Component = queryBuilderConfig.widgets[field.type].factory;
              return (
                <div key={field.id} className="mb-4 block items-center sm:flex">
                  <div className="min-w-48 mb-4 sm:mb-0">
                    <label
                      id="slug-label"
                      htmlFor="slug"
                      className="flex text-sm font-medium text-neutral-700">
                      {field.label}
                    </label>
                  </div>
                  <div className="w-full">
                    <div className="flex rounded-sm shadow-sm">
                      <Component
                        className="block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 sm:text-sm"
                        value={response[field.id]}
                        setValue={(value) => {
                          setResponse((responses) => {
                            responses = responses || {};
                            return {
                              ...responses,
                              [field.id]: value,
                            };
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
              <button
                type="submit"
                data-testid="update-eventtype"
                className="dark:text-darkmodebrandcontrast text-brandcontrast bg-brand dark:bg-darkmodebrand relative inline-flex items-center rounded-sm border border-transparent px-3 py-2 text-sm font-medium hover:bg-opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function processRoute({ form, response = {} }) {
  const queryBuilderConfig = getQueryBuilderConfig(form);
  const routes = form.route;
  let decidedAction = null;
  routes.some((route) => {
    const state = {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), queryBuilderConfig),
      config: queryBuilderConfig,
    };
    const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
    const logic = jsonLogicQuery.logic;
    let result = false;
    if (logic) {
      result = jsonLogic.apply(logic as any, response);
    }
    if (result) {
      decidedAction = route.action;
      return true;
    }
  });

  return decidedAction;
}
