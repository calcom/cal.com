import jsonLogic from "json-logic-js";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@calcom/ui";
import { Form, Label } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import { getQueryBuilderConfig } from "../pages/routing";

export default function RoutingForm({ formId }) {
  const { isLoading, data: form } = trpc.useQuery([
    "viewer.app_routing-forms.form",
    {
      id: formId,
    },
  ]);

  const router = useRouter();

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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
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

        if (decidedAction) {
          if (decidedAction.type === "customPageMessage") {
            alert(decidedAction.value);
          } else if (decidedAction.type === "eventTypeRedirectUrl") {
            router.push(`/${decidedAction.value}`);
          } else if (decidedAction.type === "externalRedirectUrl") {
            window.location.href = decidedAction.value;
          }
        } else {
          alert("No Matching Route found");
        }

        responseMutation.mutate({
          formId,
          formFillerId: uuidv4(),
          response: response,
        });
      }}>
      <div>Form:{formId}</div>
      {form.fields.map((field) => {
        const Component = queryBuilderConfig.widgets[field.type].factory;
        return (
          <div key={field.id}>
            <Label>{field.label}</Label>
            <Component
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
        );
      })}
      <Button type="submit">Submit</Button>
    </form>
  );
}
