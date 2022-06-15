import {
  ExternalLinkIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/solid";
import jsonLogic from "json-logic-js";
import { debounce } from "lodash";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonGroup, Config, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button, Switch } from "@calcom/ui";
import { Label } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";
import { SelectWithValidation as Select } from "@components/ui/form/Select";

import RoutingShell from "../components/RoutingShell";
import SideBar from "../components/SideBar";
import RoutingForm, { processRoute } from "../components/form";
// @ts-ignore
import CalConfig from "../components/react-awesome-query-builder/config/config";
import { FieldTypes } from "./form";

const InitialConfig = CalConfig as Config;

export function getQueryBuilderConfig(form: any) {
  const fields = {};
  form?.fields.forEach((field) => {
    if (FieldTypes.map((f) => f.value).includes(field.type)) {
      const optionValues = field.selectText?.trim().split("\n");
      const options = optionValues?.map((value) => {
        const title = value;
        return {
          value,
          title,
        };
      });

      fields[field.id] = {
        label: field.label,
        type: InitialConfig.widgets[field.type].type,
        valueSources: ["value"],
        fieldSettings: {
          listValues: options,
        },
        // preferWidgets: field.type === "textarea" ? ["textarea"] : [],
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

const createFallbackRoute = (): SerializableRoute => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    isFallback: true,
    action: {
      type: "customPageMessage",
      value: "Thank you for your interest! We will be in touch soon.",
    },
    queryValue: { id: uuid, type: "group" },
  };
};

type Route = {
  id: string;
  isFallback: boolean;
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

type SerializableRoute = Pick<Route, "id" | "action" | "queryValue" | "isFallback">;

const Route = ({ route, routes, setRoute, config, setRoutes, moveUp = null, moveDown = null }) => {
  const index = routes.indexOf(route);
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
  const { data: eventTypesByGroup } = trpc.useQuery(["viewer.eventTypes"]);

  const eventOptions = [];
  eventTypesByGroup?.eventTypeGroups.forEach((group) => {
    group.eventTypes.forEach((eventType) => {
      const uniqueSlug = `${group.profile.slug}/${eventType.slug}`;
      eventOptions.push({
        label: uniqueSlug,
        value: uniqueSlug,
      });
    });
  });

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

  return (
    <div className="group mb-4 flex w-full flex-row items-center justify-between hover:bg-neutral-50 ltr:mr-2 rtl:ml-2">
      {!route.isFallback ? (
        <>
          {moveUp?.check() ? (
            <button
              type="button"
              className="invisible absolute left-1/2 -mt-4 mb-4 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
              onClick={() => moveUp?.fn()}>
              <ArrowUpIcon />
            </button>
          ) : null}
          {moveDown?.check() ? (
            <button
              type="button"
              className="invisible absolute left-1/2 mt-8 -ml-4 hidden h-7 w-7 scale-0 rounded-full border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow group-hover:visible group-hover:scale-100 sm:left-[35px] sm:ml-0 sm:block"
              onClick={() => moveDown?.fn()}>
              <ArrowDownIcon />
            </button>
          ) : null}
        </>
      ) : null}
      <div className="-mx-4 mb-4 flex w-full items-center rounded-sm border border-neutral-200 bg-white sm:mx-0 sm:px-8">
        <div className="cal-query-builder m-4 my-8 mr-10 w-full ">
          <div>
            <div className="flex w-full items-center text-sm text-gray-900">
              <div className="flex flex-grow-0 whitespace-nowrap">
                <Label>{route.isFallback ? "Fallback Route" : `Route ${index + 1}`}</Label>
                <span>: Send Booker to</span>
              </div>
              <Select
                className="block w-full flex-grow px-2"
                required
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
                    required
                    className="flex w-full flex-grow border-gray-300"
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}></textarea>
                ) : route.action.type === "externalRedirectUrl" ? (
                  <input
                    className="flex w-full flex-grow border-gray-300 text-sm"
                    type="text"
                    required
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                    placeholder={"Enter External Redirect URL"}></input>
                ) : (
                  <div className="block w-full">
                    <Select
                      required
                      options={eventOptions}
                      onChange={(option) => {
                        setRoute(route.id, { action: { ...route.action, value: option.value } });
                      }}
                      value={eventOptions.find((eventOption) => eventOption.value === route.action.value)}
                    />
                  </div>
                )
              ) : null}
              {routes.length !== 1 ? (
                <button className="ml-5" type="button">
                  <TrashIcon
                    className="m-0 h-4 w-4 text-neutral-500"
                    onClick={() => {
                      const newRoutes = routes.filter((r) => r.id !== route.id);
                      setRoutes(newRoutes);
                    }}></TrashIcon>
                </button>
              ) : null}
            </div>
            <hr className="my-6 text-gray-200" />
            <Query
              {...config}
              value={route.state.tree}
              onChange={(immutableTree, config) => {
                onChange(route, immutableTree, config);
              }}
              renderBuilder={renderBuilder}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const deserializeRoute = (route: SerializableRoute, config): Route => {
  return {
    ...route,
    state: {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), config),
      config: config,
    },
  };
};

const Routes: React.FC = ({ form }) => {
  const { routes: serializedRoutes } = form;
  const { t } = useLocale();
  const config: Config = getQueryBuilderConfig(form);
  const [routes, setRoutes] = useState(() => {
    const transformRoutes = () => {
      const _routes = serializedRoutes || [getEmptyRoute()];
      _routes.forEach((r) => {
        if (!r.queryValue?.id) {
          r.queryValue = { id: QbUtils.uuid(), type: "group" };
        }
      });
      return _routes;
    };

    // TODO: Add persistence
    return transformRoutes().map((route) => deserializeRoute(route, config));
  });

  // const [form, setForm] = useState(remoteForm);
  const utils = trpc.useContext();
  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (data) => {
      showToast("Form saved successfully", "success");
    },
    onError: (error) => {
      showToast("Something went wrong", "error");
    },
  });
  const mainRoutes = routes.filter((route) => !route.isFallback);
  let fallbackRoute = routes.find((route) => route.isFallback);
  if (!fallbackRoute) {
    fallbackRoute = deserializeRoute(createFallbackRoute(), config);
    setRoutes((routes) => {
      return [...routes, fallbackRoute];
    });
    return null;
  } else if (routes.indexOf(fallbackRoute) !== routes.length - 1) {
    // Ensure fallback is last
    setRoutes((routes) => {
      return [...routes.filter((route) => route.id !== fallbackRoute.id), fallbackRoute];
    });
  }
  const setRoute = (id: string, route: Partial<Route>) => {
    const index = routes.findIndex((route) => route.id === id);
    const newRoutes = [...routes];
    newRoutes[index] = { ...routes[index], ...route };
    setRoutes(newRoutes);
  };

  const swap = (from, to) => {
    setRoutes((routes) => {
      const newRoutes = [...routes];
      const routeToSwap = newRoutes[from];
      newRoutes[from] = newRoutes[to];
      newRoutes[to] = routeToSwap;
      return newRoutes;
    });
  };

  return (
    <div className="flex">
      <form
        className="w-4/6"
        onSubmit={(e) => {
          const serializedRoutes: SerializableRoute[] = routes.map((route) => ({
            id: route.id,
            action: route.action,
            isFallback: route.isFallback,
            queryValue: route.queryValue,
          }));

          const updatedForm = {
            ...form,
            routes: serializedRoutes,
          };
          mutation.mutate(updatedForm);
          e.preventDefault();
        }}>
        {mainRoutes.map((route, key) => {
          const jsonLogicQuery = QbUtils.jsonLogicFormat(route.state.tree, route.state.config);
          console.log(`Route: ${JSON.stringify({ action: route.action, jsonLogicQuery })}`);
          return (
            <Route
              key={key}
              config={config}
              route={route}
              moveUp={{
                check: () => key !== 0,
                fn: () => {
                  swap(key, key - 1);
                },
              }}
              moveDown={{
                // routes.length - 1 is fallback route always. So, routes.length - 2 is the last item that can be moved down
                check: () => key !== routes.length - 2,
                fn: () => {
                  swap(key, key + 1);
                },
              }}
              routes={routes}
              setRoute={setRoute}
              setRoutes={setRoutes}
            />
          );
        })}
        <Button
          type="button"
          className="mb-8"
          color="secondary"
          StartIcon={PlusIcon}
          size="sm"
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
            setRoutes(newRoutes);
          }}>
          Add New Route
        </Button>
        <div>
          <Route
            config={config}
            route={fallbackRoute}
            routes={routes}
            setRoute={setRoute}
            setRoutes={setRoutes}
          />
        </div>
        <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
          <Button href="/event-types" color="secondary" tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isLoading}>
            {t("update")}
          </Button>
        </div>
      </form>
      <SideBar form={form} />
    </div>
  );
};

const RouteBuilder: React.FC = ({ subPages, Page404 }: { subPages: string[] }) => {
  const formId = subPages[0];
  const { data: form, isLoading } = trpc.useQuery([
    "viewer.app_routing_forms.form",
    {
      id: formId,
    },
  ]);
  if (subPages.length > 1) {
    return <Page404 />;
  }
  if (!form) {
    return null;
  }
  if (!form.fields) {
    form.fields = [];
  }
  return (
    <RoutingShell heading={<PencilEdit value={form.name} readOnly={true}></PencilEdit>} form={form}>
      <div className="route-config">
        <Routes form={form}></Routes>
      </div>
    </RoutingShell>
  );
};

if (typeof window !== "undefined") {
  window.jsonLogic = jsonLogic;
}

export default RouteBuilder;
