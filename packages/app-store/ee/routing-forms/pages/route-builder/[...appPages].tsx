import { useAutoAnimate } from "@formkit/auto-animate/react";
import { App_RoutingForms_Form } from "@prisma/client";
import React, { useState, useCallback } from "react";
import { Query, Config, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonTree, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { trpc } from "@calcom/trpc/react";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Icon } from "@calcom/ui";
import { Button, TextField, TextArea } from "@calcom/ui/components";
import { SelectWithValidation as Select, Shell } from "@calcom/ui/v2";
import FormCard from "@calcom/ui/v2/core/form/FormCard";

import { getServerSidePropsForSingleFormView as getServerSideProps } from "../../components/SingleForm";
import SingleForm from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { SerializableForm } from "../../types/types";
import { FieldTypes } from "../form-edit/[...appPages]";

export { getServerSideProps };

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

const InitialConfig = QueryBuilderInitialConfig;
const hasRules = (route: Route) =>
  route.queryValue.children1 && Object.keys(route.queryValue.children1).length;
type QueryBuilderUpdatedConfig = typeof QueryBuilderInitialConfig & { fields: Config["fields"] };
export function getQueryBuilderConfig(form: RoutingForm, forReporting = false) {
  const fields: Record<
    string,
    {
      label: string;
      type: string;
      valueSources: ["value"];
      fieldSettings: {
        listValues?: {
          value: string;
          title: string;
        }[];
      };
    }
  > = {};
  form.fields?.forEach((field) => {
    if (FieldTypes.map((f) => f.value).includes(field.type)) {
      const optionValues = field.selectText?.trim().split("\n");
      const options = optionValues?.map((value) => {
        const title = value;
        return {
          value,
          title,
        };
      });

      const widget = InitialConfig.widgets[field.type];
      const widgetType = widget.type;

      fields[field.id] = {
        label: field.label,
        type: widgetType,
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

  const initialConfigCopy = { ...InitialConfig };
  if (forReporting) {
    delete initialConfigCopy.operators.is_empty;
    delete initialConfigCopy.operators.is_not_empty;
    initialConfigCopy.operators.__calReporting = true;
  }
  // You need to provide your own config. See below 'Config format'
  const config: QueryBuilderUpdatedConfig = {
    ...initialConfigCopy,
    fields: fields,
  };
  return config;
}

const getEmptyRoute = (): SerializableRoute => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    action: {
      type: "eventTypeRedirectUrl",
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
  isFallback?: boolean;
  action: {
    type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    value: string;
  };
  // This is what's persisted
  queryValue: JsonTree;
  // `queryValue` is parsed to create state
  state: {
    tree: ImmutableTree;
    config: QueryBuilderUpdatedConfig;
  };
};

type SerializableRoute = Pick<Route, "id" | "action"> & {
  queryValue: Route["queryValue"];
  isFallback?: Route["isFallback"];
};

export const RoutingPages: { label: string; value: Route["action"]["type"] }[] = [
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

const Route = ({
  route,
  routes,
  setRoute,
  config,
  setRoutes,
  moveUp,
  moveDown,
}: {
  route: Route;
  routes: Route[];
  setRoute: (id: string, route: Partial<Route>) => void;
  config: QueryBuilderUpdatedConfig;
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
  moveUp?: { fn: () => void; check: () => boolean } | null;
  moveDown?: { fn: () => void; check: () => boolean } | null;
}) => {
  const index = routes.indexOf(route);

  const { data: eventTypesByGroup } = trpc.viewer.eventTypes.getByViewer.useQuery();

  const eventOptions: { label: string; value: string }[] = [];
  eventTypesByGroup?.eventTypeGroups.forEach((group) => {
    group.eventTypes.forEach((eventType) => {
      const uniqueSlug = `${group.profile.slug}/${eventType.slug}`;
      eventOptions.push({
        label: uniqueSlug,
        value: uniqueSlug,
      });
    });
  });

  const onChange = (route: Route, immutableTree: ImmutableTree, config: QueryBuilderUpdatedConfig) => {
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
    <FormCard
      className="mb-6"
      moveUp={moveUp}
      moveDown={moveDown}
      label={route.isFallback ? "Fallback Route" : `Route ${index + 1}`}
      deleteField={{
        check: () => routes.length !== 1 && !route.isFallback,
        fn: () => {
          const newRoutes = routes.filter((r) => r.id !== route.id);
          setRoutes(newRoutes);
        },
      }}>
      <div className="-mx-4 mb-4 flex w-full items-center sm:mx-0">
        <div className="cal-query-builder w-full ">
          <div>
            <div className="flex w-full items-center text-sm text-gray-900">
              <div className="flex flex-grow-0 whitespace-nowrap">
                <span>Send Booker to</span>
              </div>
              <Select
                className="block w-full flex-grow px-2"
                required
                value={RoutingPages.find((page) => page.value === route.action.type)}
                onChange={(item) => {
                  if (!item) {
                    return;
                  }
                  const action: Route["action"] = {
                    type: item.value,
                    value: "",
                  };

                  if (action.type === "customPageMessage") {
                    action.value = "We are not ready for you yet :(";
                  } else {
                    action.value = "";
                  }

                  setRoute(route.id, { action });
                }}
                options={RoutingPages}
              />
              {route.action.type ? (
                route.action.type === "customPageMessage" ? (
                  <TextArea
                    required
                    name="customPageMessage"
                    className="flex w-full flex-grow border-gray-300"
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                  />
                ) : route.action.type === "externalRedirectUrl" ? (
                  <TextField
                    name="externalRedirectUrl"
                    className="flex w-full flex-grow border-gray-300 text-sm"
                    containerClassName="w-full mt-2"
                    type="text"
                    required
                    labelSrOnly
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                    placeholder="Enter External Redirect URL"
                  />
                ) : (
                  <div className="block w-full">
                    <Select
                      required
                      options={eventOptions}
                      onChange={(option) => {
                        if (!option) {
                          return;
                        }
                        setRoute(route.id, { action: { ...route.action, value: option.value } });
                      }}
                      value={eventOptions.find((eventOption) => eventOption.value === route.action.value)}
                    />
                  </div>
                )
              ) : null}
            </div>

            {((route.isFallback && hasRules(route)) || !route.isFallback) && (
              <>
                <hr className="my-6 text-gray-200" />
                <Query
                  {...config}
                  value={route.state.tree}
                  onChange={(immutableTree, config) => {
                    onChange(route, immutableTree, config as QueryBuilderUpdatedConfig);
                  }}
                  renderBuilder={renderBuilder}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </FormCard>
  );
};

const deserializeRoute = (route: SerializableRoute, config: QueryBuilderUpdatedConfig): Route => {
  return {
    ...route,
    state: {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), config),
      config: config,
    },
  };
};

const Routes = ({
  form,
  hookForm,
}: {
  form: inferSSRProps<typeof getServerSideProps>["form"];
  // Figure out the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hookForm: any;
}) => {
  const { routes: serializedRoutes } = form;
  const config = getQueryBuilderConfig(form);
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

    return transformRoutes().map((route) => deserializeRoute(route, config));
  });

  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const mainRoutes = routes.filter((route) => !route.isFallback);
  let fallbackRoute = routes.find((route) => route.isFallback);
  if (!fallbackRoute) {
    fallbackRoute = deserializeRoute(createFallbackRoute(), config);
    setRoutes((routes) => {
      // Even though it's obvious that fallbackRoute is defined here but TypeScript just can't figure it out.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return [...routes, fallbackRoute!];
    });
    return null;
  } else if (routes.indexOf(fallbackRoute) !== routes.length - 1) {
    // Ensure fallback is last
    setRoutes((routes) => {
      // Even though it's obvious that fallbackRoute is defined here but TypeScript just can't figure it out.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return [...routes.filter((route) => route.id !== fallbackRoute!.id), fallbackRoute!];
    });
  }
  const setRoute = (id: string, route: Partial<Route>) => {
    const index = routes.findIndex((route) => route.id === id);
    const newRoutes = [...routes];
    newRoutes[index] = { ...routes[index], ...route };
    setRoutes(newRoutes);
  };

  const swap = (from: number, to: number) => {
    setRoutes((routes) => {
      const newRoutes = [...routes];
      const routeToSwap = newRoutes[from];
      newRoutes[from] = newRoutes[to];
      newRoutes[to] = routeToSwap;
      return newRoutes;
    });
  };

  const routesToSave: SerializableRoute[] = routes.map((route) => ({
    id: route.id,
    action: route.action,
    isFallback: route.isFallback,
    queryValue: route.queryValue,
  }));
  hookForm.setValue("routes", routesToSave);
  return (
    <div className="flex flex-col-reverse md:flex-row">
      <div ref={animationRef} className="w-full ltr:mr-2 rtl:ml-2">
        {mainRoutes.map((route, key) => {
          return (
            <Route
              key={route.id}
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
          className="mb-6"
          color="secondary"
          StartIcon={Icon.FiPlus}
          data-testid="add-route"
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
          Add Route
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
      </div>
    </div>
  );
};

export default function RouteBuilder({
  form,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      Page={({ hookForm, form }) => (
        <div className="route-config">
          <Routes hookForm={hookForm} form={form} />
        </div>
      )}
    />
  );
}

RouteBuilder.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
      {page}
    </Shell>
  );
};
