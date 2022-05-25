import { ExternalLinkIcon } from "@heroicons/react/solid";
import jsonLogic from "json-logic-js";
import { debounce } from "lodash";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonGroup, Config, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { Button } from "@calcom/ui";
import { Label } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";
import Select from "@components/ui/form/Select";

import { utils } from "../../slackmessaging/lib";
import RoutingShell from "../components/RoutingShell";
import RoutingForm, { processRoute } from "../components/form";
// @ts-ignore
import CalConfig from "../components/react-awesome-query-builder/config/config";
import { FieldTypes } from "./form";

const InitialConfig = CalConfig as Config;

const fields = {};
export function getQueryBuilderConfig(form: any) {
  form?.fields.forEach((field) => {
    if (FieldTypes.map((f) => f.value).includes(field.type)) {
      fields[field.id] = {
        label: field.label,
        type: field.type,
        valueSources: ["value"],
      };
    } else {
      throw new Error("Unsupported field type:" + field.type);
    }
  });

  // You need to provide your own config. See below 'Config format'
  const config: Config = {
    ...InitialConfig,
    fields: fields,
  };
  return config;
}

const getEmptyRoute = (): SerializableRoute => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    action: {
      type: "",
      value: "",
    },
    queryValue: { id: uuid, type: "group" },
  };
};

type Route = {
  id: string;
  action: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  };
  // This is what's persisted
  queryValue: JsonGroup;
  // `queryValue` is parsed to create state
  state: {
    tree: ImmutableTree;
    config: Config;
  };
};

type SerializableRoute = Pick<Route, "id" | "action" | "queryValue">;

const RouteBuilder: React.FC = ({ subPages, Page404 }: { subPages: string[] }) => {
  const formId = subPages[0];
  const utils = trpc.useContext();

  const { data: remoteForm, isLoading } = trpc.useQuery([
    "viewer.app_routing-forms.form",
    {
      id: formId,
    },
  ]);
  const [form, setForm] = useState(remoteForm);
  const mutation = trpc.useMutation("viewer.app_routing-forms.form", {
    onSettled: () => {
      utils.invalidateQueries([
        "viewer.app_routing-forms.form",
        {
          id: formId,
        },
      ]);
    },
  });

  const mutate = debounce((newForm) => {
    const updatedForm = {
      ...form,
      ...newForm,
    };
    setForm(updatedForm);
    mutation.mutate(updatedForm);
  });

  const config: Config = getQueryBuilderConfig(form);
  const getStoredRoutes = () => {
    const route = form?.route || [getEmptyRoute()];
    route.forEach((r) => {
      if (!r.queryValue?.id) {
        r.queryValue = { id: QbUtils.uuid(), type: "group" };
      }
    });
    return route;
  };

  // TODO: Add persistence
  const routes = getStoredRoutes().map((route) => ({
    ...route,
    state: {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), config),
      config: config,
    },
  }));

  const setStoredRoutes = (routes: Route[]) => {
    const serializedRoutes: SerializableRoute[] = routes.map((route) => ({
      id: route.id,
      action: route.action,
      queryValue: route.queryValue,
    }));
    mutate({
      route: serializedRoutes,
    });
  };

  const setRoute = (id: string, route: Partial<Route>) => {
    const index = routes.findIndex((route) => route.id === id);
    const newRoutes = [...routes];
    newRoutes[index] = { ...routes[index], ...route };
    setStoredRoutes(newRoutes);
  };

  const onChange = (route, immutableTree: ImmutableTree, config: Config) => {
    const jsonTree = QbUtils.getTree(immutableTree);
    setRoute(route.id, {
      state: { tree: immutableTree, config: config },
      queryValue: jsonTree,
    });
  };

  const renderBuilder = useCallback(
    (props: BuilderProps) => (
      <div className="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...props} />
        </div>
      </div>
    ),
    []
  );

  const [previewResponse, setPreviewResponse] = useState(null);
  const getActionSummary = () => {
    if (!previewResponse) {
      return "Submit the form to evaluate the route";
    }
    const decidedAction = processRoute({ form, response: previewResponse });
    if (!decidedAction) {
      return "Now route can be matched";
    }
    if (decidedAction.type === "customPageMessage") {
      return "Show the custom message: " + decidedAction.value;
    } else if (decidedAction.type === "eventTypeRedirectUrl") {
      return `Take user to /${decidedAction.value}`;
    } else if (decidedAction.type === "externalRedirectUrl") {
      return `Take user to ${decidedAction.value}`;
    }
  };
  if (subPages.length > 1) {
    return <Page404 />;
  }
  if (!form) {
    return null;
  }
  if (!form.fields) {
    form.fields = [];
  }

  const RoutingPages = [
    {
      label: "Custom Page",
      value: "customPageMessage",
    },
    {
      label: "External Redirect",
      value: "externalRedirectUrl",
    },
    {
      label: "Event Redirect",
      value: "eventTypeRedirectUrl",
    },
  ];
  return (
    <RoutingShell heading={<PencilEdit value={form.name} readOnly={true}></PencilEdit>} form={form}>
      <div className="flex">
        <div className="route-config -mx-4 flex w-4/6 flex-col rounded-sm border border-neutral-200 bg-white sm:mx-0 sm:px-8">
          <a
            href={"/apps/routing-forms/routingLink/" + formId}
            target="_blank"
            rel="noreferrer"
            className="text-md my-3 inline-flex items-center self-end rounded-sm px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-gray-200 hover:text-gray-900">
            <ExternalLinkIcon className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
            Visit Routing Form
          </a>
          <div className="cal-query-builder m-4 my-3 mr-10 ">
            {routes.map((route, key) => {
              const jsonLogicQuery = QbUtils.jsonLogicFormat(route.state.tree, route.state.config);
              console.log(`Route: ${JSON.stringify({ action: route.action, jsonLogicQuery })}`);
              return (
                <div key={key}>
                  {key !== 0 ? <hr className="my-4" /> : null}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Label className="text-lg">Go to</Label>
                      <Select
                        className="ml-10"
                        value={RoutingPages.find((page) => page.value === route.action.type)}
                        onChange={(item) => {
                          if (!item) {
                            return;
                          }
                          const action = {
                            type: item.value,
                          };

                          if (action.type === "customPageMessage") {
                            action.value = "We are not ready for you yet :(";
                          } else {
                            action.value = "";
                          }

                          setRoute(route.id, { action });
                        }}
                        options={RoutingPages}></Select>

                      {route.action.type ? (
                        route.action.type === "customPageMessage" ? (
                          <textarea
                            value={route.action.value}
                            onChange={(e) => {
                              setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                            }}></textarea>
                        ) : (
                          <input
                            type="text"
                            value={route.action.value}
                            onChange={(e) => {
                              setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                            }}
                            placeholder={
                              route.action.type === "eventTypeRedirectUrl"
                                ? "Enter Cal Link"
                                : "Enter External Redirect URL"
                            }></input>
                        )
                      ) : null}

                      <div className="ml-10 text-xl italic">IF</div>
                    </div>
                    <Button
                      onClick={() => {
                        const newRoutes = routes.filter((r) => r.id !== route.id);
                        setStoredRoutes(newRoutes);
                      }}>
                      Delete Route
                    </Button>
                  </div>
                  <Query
                    {...config}
                    value={route.state.tree}
                    onChange={(immutableTree, config) => {
                      onChange(route, immutableTree, config);
                    }}
                    renderBuilder={renderBuilder}
                  />
                </div>
              );
            })}
            <Button
              onClick={() => {
                const newEmptyRoute = getEmptyRoute();
                const newRoutes = [
                  ...routes,
                  {
                    ...newEmptyRoute,
                    state: {
                      tree: QbUtils.checkTree(QbUtils.loadTree(newEmptyRoute.queryValue), config),
                      config,
                    },
                  },
                ];
                setStoredRoutes(newRoutes);
              }}>
              Add New Route
            </Button>
          </div>
        </div>
        <div className="ml-10 w-2/6">
          <div className="transition-max-width mx-auto my-0 max-w-3xl duration-500 ease-in-out md:mb-10">
            <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
              <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
                <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
                  Result
                </h1>
                <div>{getActionSummary()}</div>
              </div>
            </div>
          </div>

          <RoutingForm
            formId={formId}
            onSubmit={(response) => {
              setPreviewResponse(response);
            }}></RoutingForm>
        </div>
      </div>
    </RoutingShell>
  );
};

if (typeof window !== "undefined") {
  window.jsonLogic = jsonLogic;
}

export default RouteBuilder;
