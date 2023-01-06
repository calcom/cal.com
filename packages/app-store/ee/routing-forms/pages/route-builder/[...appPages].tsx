import { useAutoAnimate } from "@formkit/auto-animate/react";
import { App_RoutingForms_Form } from "@prisma/client";
import Link from "next/link";
import React, { useCallback, useState } from "react";
import { Query, Config, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonTree, ImmutableTree, BuilderProps } from "react-awesome-query-builder";

import { trpc } from "@calcom/trpc/react";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import {
  SelectField,
  FormCard,
  SelectWithValidation as Select,
  Shell,
  TextArea,
  TextField,
  Badge,
} from "@calcom/ui";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import QueryBuilderInitialConfig from "../../components/react-awesome-query-builder/config/config";
import "../../components/react-awesome-query-builder/styles.css";
import { createFallbackRoute } from "../../lib/createFallbackRoute";
import isRouter from "../../lib/isRouter";
import { GlobalRoute, LocalRoute, SerializableForm, SerializableRoute } from "../../types/types";
import { FieldTypes } from "../form-edit/[...appPages]";

export { getServerSideProps };

type RoutingForm = SerializableForm<App_RoutingForms_Form>;

const InitialConfig = QueryBuilderInitialConfig;
const hasRules = (route: Route) => {
  if (isRouter(route)) return false;
  route.queryValue.children1 && Object.keys(route.queryValue.children1).length;
};
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
    if ("routerField" in field) {
      field = field.routerField;
    }
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

  const initialConfigCopy = { ...InitialConfig, operators: { ...InitialConfig.operators } };
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

const getEmptyRoute = (): Exclude<SerializableRoute, GlobalRoute> => {
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

type Route =
  | (LocalRoute & {
      // This is what's persisted
      queryValue: JsonTree;
      // `queryValue` is parsed to create state
      state: {
        tree: ImmutableTree;
        config: QueryBuilderUpdatedConfig;
      };
    })
  | GlobalRoute;

export const RoutingPages: { label: string; value: NonNullable<LocalRoute["action"]>["type"] }[] = [
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
  appUrl,
  disabled = false,
}: {
  route: Route;
  routes: Route[];
  setRoute: (id: string, route: Partial<Route>) => void;
  config: QueryBuilderUpdatedConfig;
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
  moveUp?: { fn: () => void; check: () => boolean } | null;
  moveDown?: { fn: () => void; check: () => boolean } | null;
  appUrl: string;
  disabled?: boolean;
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

  if (isRouter(route)) {
    return (
      <div>
        <FormCard
          moveUp={moveUp}
          moveDown={moveDown}
          deleteField={{
            check: () => routes.length !== 1,
            fn: () => {
              const newRoutes = routes.filter((r) => r.id !== route.id);
              setRoutes(newRoutes);
            },
          }}
          label={
            <div>
              <span className="mr-2">{`Route ${index + 1}`}</span>
            </div>
          }
          className="mb-6">
          <div className="-mt-3">
            <Link href={`/${appUrl}/route-builder/${route.id}`}>
              <Badge variant="gray">
                <span className="font-semibold">{route.name}</span>
              </Badge>
            </Link>
            <p className="mt-2 text-sm text-gray-500">
              Fields available in <span className="font-bold">{route.name}</span> will be added to this form.
            </p>
          </div>
        </FormCard>
      </div>
    );
  }

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
                isDisabled={disabled}
                className="block w-full flex-grow px-2"
                required
                value={RoutingPages.find((page) => page.value === route.action?.type)}
                onChange={(item) => {
                  if (!item) {
                    return;
                  }
                  const action: LocalRoute["action"] = {
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
              {route.action?.type ? (
                route.action?.type === "customPageMessage" ? (
                  <TextArea
                    required
                    disabled={disabled}
                    name="customPageMessage"
                    className="flex w-full flex-grow border-gray-300"
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                  />
                ) : route.action?.type === "externalRedirectUrl" ? (
                  <TextField
                    disabled={disabled}
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
                      isDisabled={disabled}
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

const deserializeRoute = (
  route: Exclude<SerializableRoute, GlobalRoute>,
  config: QueryBuilderUpdatedConfig
): Route => {
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
  appUrl,
}: {
  form: inferSSRProps<typeof getServerSideProps>["form"];
  // Figure out the type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hookForm: any;
  appUrl: string;
}) => {
  const { routes: serializedRoutes } = form;

  const config = getQueryBuilderConfig(form);
  const [routes, setRoutes] = useState(() => {
    const transformRoutes = () => {
      const _routes = serializedRoutes || [getEmptyRoute()];
      _routes.forEach((r) => {
        if (isRouter(r)) return;
        if (!r.queryValue?.id) {
          r.queryValue = { id: QbUtils.uuid(), type: "group" };
        }
      });
      return _routes;
    };

    return transformRoutes().map((route) => {
      if (isRouter(route)) return route;
      return deserializeRoute(route, config);
    });
  });
  const { data: allForms } = trpc.viewer.appRoutingForms.forms.useQuery();

  const availableRouters =
    allForms
      ?.filter((router) => {
        return router.id !== form.id;
      })
      .map((router) => {
        return {
          value: router.id,
          label: router.name,
          name: router.name,
          description: router.description,
          isDisabled: false,
        };
      }) || [];

  const isConnectedForm = (id: string) => form.connectedForms.map((f) => f.id).includes(id);

  const routerOptions = (
    [
      {
        label: "Create a New Route",
        value: "newRoute",
        name: null,
        description: null,
      },
    ] as {
      label: string;
      value: string;
      name: string | null;
      description: string | null;
      isDisabled?: boolean;
    }[]
  ).concat(
    availableRouters.map((r) => {
      // Reset disabled state
      r.isDisabled = false;

      // Can't select a form as router that is already a connected form. It avoids cyclic dependency
      if (isConnectedForm(r.value)) {
        r.isDisabled = true;
      }
      // A route that's already used, can't be reselected
      if (routes.find((route) => route.id === r.value)) {
        r.isDisabled = true;
      }
      return r;
    })
  );

  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const mainRoutes = routes.filter((route) => {
    if (isRouter(route)) return true;
    return !route.isFallback;
  });

  let fallbackRoute = routes.find((route) => {
    if (isRouter(route)) return false;
    return route.isFallback;
  });

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

  const routesToSave = routes.map((route) => {
    if (isRouter(route)) {
      return route;
    }
    return {
      id: route.id,
      action: route.action,
      isFallback: route.isFallback,
      queryValue: route.queryValue,
    };
  });

  hookForm.setValue("routes", routesToSave);

  return (
    <div className="flex flex-col-reverse md:flex-row">
      <div ref={animationRef} className="w-full ltr:mr-2 rtl:ml-2">
        {mainRoutes.map((route, key) => {
          return (
            <Route
              appUrl={appUrl}
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
        <SelectField
          placeholder="Select a router"
          containerClassName="mb-6 data-testid-select-router"
          isOptionDisabled={(option) => !!option.isDisabled}
          label="Add a new Route"
          options={routerOptions}
          key={mainRoutes.length}
          onChange={(option) => {
            if (!option) {
              return;
            }
            const router = option.value;
            if (router === "newRoute") {
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
            } else {
              const routerId = router;
              if (!routerId) {
                return;
              }
              setRoutes([
                ...routes,
                {
                  isRouter: true,
                  id: routerId,
                  name: option.name,
                  description: option.description,
                } as Route,
              ]);
            }
          }}
        />

        <div>
          <Route
            config={config}
            route={fallbackRoute}
            routes={routes}
            setRoute={setRoute}
            setRoutes={setRoutes}
            appUrl={appUrl}
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
          <Routes hookForm={hookForm} appUrl={appUrl} form={form} />
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
