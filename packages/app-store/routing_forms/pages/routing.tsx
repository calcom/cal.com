import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  DragOverlay,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLinkIcon, PlusIcon, TrashIcon } from "@heroicons/react/solid";
import jsonLogic from "json-logic-js";
import { debounce } from "lodash";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
// types
import { JsonGroup, Config, ImmutableTree, BuilderProps } from "react-awesome-query-builder";
import { useForm, useFieldArray, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
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
const DragHandle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gray" width="18px" height="18px">
    <path d="M0 0h24v24H0V0z" fill="none"></path>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
  </svg>
);
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

const Route = ({ index, routes, setRoute, config, setRoutes }) => {
  const route = routes[index];
  console.log(route, index, routes);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: route.id });
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
  const style = {
    transform: CSS.Transform.toString(transform),
    // transition,
  };
  return (
    <div style={style} ref={setNodeRef} className="flex flex-row items-center">
      <div {...listeners} {...attributes} className="mr-4">
        <DragHandle />
      </div>
      <div className="-mx-4 mb-4 flex w-full items-center rounded-sm border border-neutral-200 bg-white sm:mx-0 sm:px-8">
        <div className="cal-query-builder m-4 my-8 mr-10 w-full ">
          <div>
            <div className="flex items-center text-sm text-gray-900">
              <div className="flex">
                <Label>Route {index + 1}</Label>
                <span>: Send Booker to</span>
              </div>
              <Select
                className="flex px-2"
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
                    className="flex flex-grow border-gray-300"
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}></textarea>
                ) : (
                  <input
                    className="flex flex-grow border-gray-300 text-sm"
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

const Routes: React.FC = ({ form }) => {
  const { route: serializedRoutes } = form;
  const { t } = useLocale();
  const config: Config = getQueryBuilderConfig(form);
  const [routeBeingDragged, setRouteBeingDragged] = useState(null);
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
    return transformRoutes().map((route) => ({
      ...route,
      state: {
        tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), config),
        config: config,
      },
    }));
  });
  // const [form, setForm] = useState(remoteForm);
  const utils = trpc.useContext();
  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSettled: () => {
      // utils.invalidateQueries([
      //   "viewer.app_routing_forms.form",
      //   {
      //     id: formId,
      //   },
      // ]);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: Event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setRoutes((routes) => {
        const oldIndex = routes.findIndex((r) => r.id === active.id);
        const newIndex = routes.findIndex((r) => r.id === over.id);

        return arrayMove(routes, oldIndex, newIndex);
      });
    }
  }

  const setRoute = (id: string, route: Partial<Route>) => {
    const index = routes.findIndex((route) => route.id === id);
    const newRoutes = [...routes];
    newRoutes[index] = { ...routes[index], ...route };
    setRoutes(newRoutes);
  };

  return (
    <form
      className="w-4/6"
      onSubmit={(e) => {
        const serializedRoutes: SerializableRoute[] = routes.map((route) => ({
          id: route.id,
          action: route.action,
          queryValue: route.queryValue,
        }));
        const updatedForm = {
          ...form,
          route: serializedRoutes,
        };
        mutation.mutate(updatedForm);
        e.preventDefault();
      }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          setRouteBeingDragged(event.active.id);
        }}
        onDragEnd={handleDragEnd}>
        <SortableContext items={routes} strategy={verticalListSortingStrategy}>
          {routes.map((route, key) => {
            const jsonLogicQuery = QbUtils.jsonLogicFormat(route.state.tree, route.state.config);
            console.log(`Route: ${JSON.stringify({ action: route.action, jsonLogicQuery })}`);
            return (
              <Route
                key={key}
                config={config}
                index={key}
                routes={routes}
                setRoute={setRoute}
                setRoutes={setRoutes}></Route>
            );
          })}
        </SortableContext>
        <DragOverlay>
          {routeBeingDragged ? (
            <Route index={0} config={config} routes={routes} setRoute={setRoute}></Route>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Button
        type="button"
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
      <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
        <Button href="/event-types" color="secondary" tabIndex={-1}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isLoading}>
          {t("update")}
        </Button>
      </div>
    </form>
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
