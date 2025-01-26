"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import React, { useCallback, useState, useEffect } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
import type { ImmutableTree, BuilderProps, Config } from "react-awesome-query-builder";
import type { JsonTree } from "react-awesome-query-builder";
import type { UseFormReturn } from "react-hook-form";

import Shell from "@calcom/features/shell/Shell";
import { areTheySiblingEntitites } from "@calcom/lib/entityPermissionUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { buildEmptyQueryValue } from "@calcom/lib/raqb/raqbUtils";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import {
  SelectField,
  FormCard,
  SelectWithValidation as Select,
  TextArea,
  TextField,
  Badge,
  Divider,
} from "@calcom/ui";

import { routingFormAppComponents } from "../../appComponents";
import DynamicAppComponent from "../../components/DynamicAppComponent";
import type { RoutingFormWithResponseCount } from "../../components/SingleForm";
import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import {
  withRaqbSettingsAndWidgets,
  ConfigFor,
} from "../../components/react-awesome-query-builder/config/uiConfig";
import { RoutingPages } from "../../lib/RoutingPages";
import { createFallbackRoute } from "../../lib/createFallbackRoute";
import getEventTypeAppMetadata from "../../lib/getEventTypeAppMetadata";
import {
  getQueryBuilderConfigForFormFields,
  getQueryBuilderConfigForAttributes,
  type FormFieldsQueryBuilderConfigWithRaqbFields,
  type AttributesQueryBuilderConfigWithRaqbFields,
} from "../../lib/getQueryBuilderConfig";
import isRouter from "../../lib/isRouter";
import type { SerializableForm } from "../../types/types";
import type {
  GlobalRoute,
  LocalRoute,
  SerializableRoute,
  Attribute,
  EditFormRoute,
  AttributeRoutingConfig,
} from "../../types/types";
import { RouteActionType } from "../../zod";

type EventTypesByGroup = RouterOutputs["viewer"]["eventTypes"]["getByViewer"];

type Form = inferSSRProps<typeof getServerSideProps>["form"];

type SetRoute = (id: string, route: Partial<EditFormRoute>) => void;

type AttributesQueryValue = NonNullable<LocalRoute["attributesQueryValue"]>;
type FormFieldsQueryValue = LocalRoute["queryValue"];

/**
 * We need eventTypeId in every redirect url action now for Rerouting to work smoothly.
 * This hook ensures that it is there as soon as someone lands on a Routing Form and next save would automatically update it for them.
 */
function useEnsureEventTypeIdInRedirectUrlAction({
  route,
  eventOptions,
  setRoute,
}: {
  route: EditFormRoute;
  eventOptions: { label: string; value: string; eventTypeId: number }[];
  setRoute: SetRoute;
}) {
  useEffect(() => {
    if (isRouter(route)) {
      return;
    }

    if (
      route.action.type !== RouteActionType.EventTypeRedirectUrl ||
      // Must not be set already. Could be zero as well for custom
      route.action.eventTypeId !== undefined
    ) {
      return;
    }

    const matchingOption = eventOptions.find((eventOption) => eventOption.value === route.action.value);
    if (!matchingOption) {
      return;
    }
    setRoute(route.id, {
      action: { ...route.action, eventTypeId: matchingOption.eventTypeId },
    });
  }, [eventOptions, setRoute, route.id, (route as unknown as any).action?.value]);
}

const hasRules = (route: EditFormRoute) => {
  if (isRouter(route)) return false;
  route.queryValue.children1 && Object.keys(route.queryValue.children1).length;
};

function getEmptyQueryValue() {
  return buildEmptyQueryValue();
}

const getEmptyRoute = (): Exclude<SerializableRoute, GlobalRoute> => {
  const uuid = QbUtils.uuid();
  const formFieldsQueryValue = getEmptyQueryValue() as FormFieldsQueryValue;
  const attributesQueryValue = getEmptyQueryValue() as AttributesQueryValue;
  const fallbackAttributesQueryValue = getEmptyQueryValue() as AttributesQueryValue;

  return {
    id: uuid,
    action: {
      type: RouteActionType.EventTypeRedirectUrl,
      value: "",
    },
    // It is actually formFieldsQueryValue
    queryValue: formFieldsQueryValue,
    attributesQueryValue: attributesQueryValue,
    fallbackAttributesQueryValue: fallbackAttributesQueryValue,
  };
};

const buildEventsData = ({
  eventTypesByGroup,
  form,
  route,
}: {
  eventTypesByGroup: EventTypesByGroup | undefined;
  form: Form;
  route: EditFormRoute;
}) => {
  const eventOptions: {
    label: string;
    value: string;
    eventTypeId: number;
    eventTypeAppMetadata?: Record<string, any>;
  }[] = [];
  const eventTypesMap = new Map<
    number,
    {
      schedulingType: SchedulingType | null;
      eventTypeAppMetadata?: Record<string, any>;
    }
  >();
  eventTypesByGroup?.eventTypeGroups.forEach((group) => {
    const eventTypeValidInContext = areTheySiblingEntitites({
      entity1: {
        teamId: group.teamId ?? null,
        // group doesn't have userId. The query ensures that it belongs to the user only, if teamId isn't set. So, I am manually setting it to the form userId
        userId: form.userId,
      },
      entity2: {
        teamId: form.teamId ?? null,
        userId: form.userId,
      },
    });

    group.eventTypes.forEach((eventType) => {
      if (eventType.teamId && eventType.schedulingType === SchedulingType.MANAGED) {
        return;
      }
      const uniqueSlug = `${group.profile.slug}/${eventType.slug}`;
      const isRouteAlreadyInUse = isRouter(route) ? false : uniqueSlug === route.action.value;

      // If Event is already in use, we let it be so as to not break the existing setup
      if (!isRouteAlreadyInUse && !eventTypeValidInContext) {
        return;
      }

      // Pass app data that works with routing forms
      const eventTypeAppMetadata = getEventTypeAppMetadata(eventType.metadata);

      eventTypesMap.set(eventType.id, {
        eventTypeAppMetadata,
        schedulingType: eventType.schedulingType,
      });
      eventOptions.push({
        label: uniqueSlug,
        value: uniqueSlug,
        eventTypeId: eventType.id,
        eventTypeAppMetadata,
      });
    });
  });

  return { eventOptions, eventTypesMap };
};

const Route = ({
  form,
  route,
  routes,
  setRoute,
  setAttributeRoutingConfig,
  formFieldsQueryBuilderConfig,
  attributesQueryBuilderConfig,
  setRoutes,
  moveUp,
  moveDown,
  appUrl,
  disabled = false,
  fieldIdentifiers,
  eventTypesByGroup,
}: {
  form: Form;
  route: EditFormRoute;
  routes: EditFormRoute[];
  setRoute: SetRoute;
  setAttributeRoutingConfig: (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => void;
  formFieldsQueryBuilderConfig: FormFieldsQueryBuilderConfigWithRaqbFields;
  attributesQueryBuilderConfig: AttributesQueryBuilderConfigWithRaqbFields | null;
  setRoutes: React.Dispatch<React.SetStateAction<EditFormRoute[]>>;
  fieldIdentifiers: string[];
  moveUp?: { fn: () => void; check: () => boolean } | null;
  moveDown?: { fn: () => void; check: () => boolean } | null;
  appUrl: string;
  disabled?: boolean;
  eventTypesByGroup: EventTypesByGroup;
}) => {
  const { t } = useLocale();
  const isTeamForm = form.teamId !== null;
  const index = routes.indexOf(route);

  const { eventOptions, eventTypesMap } = buildEventsData({ eventTypesByGroup, form, route });

  // /team/{TEAM_SLUG}/{EVENT_SLUG} -> /team/{TEAM_SLUG}
  const eventTypePrefix =
    eventOptions.length !== 0
      ? eventOptions[0].value.substring(0, eventOptions[0].value.lastIndexOf("/") + 1)
      : "";

  const [customEventTypeSlug, setCustomEventTypeSlug] = useState<string>("");

  useEffect(() => {
    const isCustom =
      !isRouter(route) && !eventOptions.find((eventOption) => eventOption.value === route.action.value);
    setCustomEventTypeSlug(isCustom && !isRouter(route) ? route.action.value.split("/").pop() ?? "" : "");
  }, []);

  useEnsureEventTypeIdInRedirectUrlAction({
    route,
    eventOptions,
    setRoute,
  });

  const onChangeFormFieldsQuery = (
    route: EditFormRoute,
    immutableTree: ImmutableTree,
    config: FormFieldsQueryBuilderConfigWithRaqbFields
  ) => {
    const jsonTree = QbUtils.getTree(immutableTree) as LocalRoute["queryValue"];
    setRoute(route.id, {
      formFieldsQueryBuilderState: { tree: immutableTree, config: config },
      queryValue: jsonTree,
    });
  };

  const onChangeTeamMembersQuery = (
    route: EditFormRoute,
    immutableTree: ImmutableTree,
    config: AttributesQueryBuilderConfigWithRaqbFields
  ) => {
    const jsonTree = QbUtils.getTree(immutableTree);
    setRoute(route.id, {
      attributesQueryBuilderState: { tree: immutableTree, config: config },
      attributesQueryValue: jsonTree as AttributesQueryValue,
    });
  };

  const onChangeFallbackTeamMembersQuery = (
    route: EditFormRoute,
    immutableTree: ImmutableTree,
    config: AttributesQueryBuilderConfigWithRaqbFields
  ) => {
    const jsonTree = QbUtils.getTree(immutableTree);
    setRoute(route.id, {
      fallbackAttributesQueryBuilderState: { tree: immutableTree, config: config },
      fallbackAttributesQueryValue: jsonTree as AttributesQueryValue,
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
          isLabelEditable={false}
          label={route.name ?? `Route ${index + 1}`}
          className="mb-6">
          <div className="-mt-3">
            <Link href={`${appUrl}/route-builder/${route.id}`}>
              <Badge variant="gray">
                <span className="font-semibold">{route.name}</span>
              </Badge>
            </Link>
            <p className="text-subtle mt-2 text-sm">
              Fields available in <span className="font-bold">{route.name}</span> will be added to this form.
            </p>
          </div>
        </FormCard>
      </div>
    );
  }

  const shouldShowFormFieldsQueryBuilder = (route.isFallback && hasRules(route)) || !route.isFallback;
  const eventTypeRedirectUrlOptions =
    eventOptions.length !== 0
      ? [{ label: t("custom"), value: "custom", eventTypeId: 0 }].concat(eventOptions)
      : [];

  const eventTypeRedirectUrlSelectedOption =
    eventOptions.length !== 0 && route.action.value !== ""
      ? eventOptions.find(
          (eventOption) => eventOption.value === route.action.value && !customEventTypeSlug.length
        ) || {
          label: t("custom"),
          value: "custom",
          eventTypeId: 0,
        }
      : undefined;

  const formFieldsQueryBuilder = shouldShowFormFieldsQueryBuilder ? (
    <div>
      <span className="text-emphasis flex w-full items-center text-sm">
        For responses matching the following criteria (matches all by default)
      </span>
      <Query
        {...withRaqbSettingsAndWidgets({
          config: formFieldsQueryBuilderConfig,
          configFor: ConfigFor.FormFields,
        })}
        value={route.formFieldsQueryBuilderState.tree}
        onChange={(immutableTree, formFieldsQueryBuilderConfig) => {
          onChangeFormFieldsQuery(
            route,
            immutableTree,
            formFieldsQueryBuilderConfig as unknown as FormFieldsQueryBuilderConfigWithRaqbFields
          );
        }}
        renderBuilder={renderBuilder}
      />
      <Divider className="mt-6" />
      <Divider className="mb-6 " />
    </div>
  ) : null;

  const attributesQueryBuilderConfigWithRaqbSettingsAndWidgets = attributesQueryBuilderConfig
    ? withRaqbSettingsAndWidgets({
        config: attributesQueryBuilderConfig,
        configFor: ConfigFor.Attributes,
      })
    : null;

  const attributesQueryBuilder =
    route.action?.type === RouteActionType.EventTypeRedirectUrl && isTeamForm ? (
      <div className="mt-4">
        <span className="text-emphasis flex w-full items-center text-sm">
          and use only the Team Members that match the following criteria (matches all by default)
        </span>

        {eventTypeRedirectUrlSelectedOption?.eventTypeAppMetadata &&
        "salesforce" in eventTypeRedirectUrlSelectedOption.eventTypeAppMetadata ? (
          <div className="mt-4 px-2.5">
            <DynamicAppComponent
              componentMap={routingFormAppComponents}
              slug="salesforce"
              appData={eventTypeRedirectUrlSelectedOption?.eventTypeAppMetadata["salesforce"]}
              route={route}
              setAttributeRoutingConfig={setAttributeRoutingConfig}
            />
          </div>
        ) : null}

        <div className="mt-2">
          {route.attributesQueryBuilderState && attributesQueryBuilderConfigWithRaqbSettingsAndWidgets && (
            <Query
              {...attributesQueryBuilderConfigWithRaqbSettingsAndWidgets}
              value={route.attributesQueryBuilderState.tree}
              onChange={(immutableTree, attributesQueryBuilderConfig) => {
                onChangeTeamMembersQuery(
                  route,
                  immutableTree,
                  attributesQueryBuilderConfig as unknown as AttributesQueryBuilderConfigWithRaqbFields
                );
              }}
              renderBuilder={renderBuilder}
            />
          )}
        </div>
      </div>
    ) : null;

  const fallbackAttributesQueryBuilder =
    route.action?.type === RouteActionType.EventTypeRedirectUrl && isTeamForm ? (
      <div className="mt-4">
        <span className="text-emphasis flex w-full items-center text-sm">
          {t("fallback_attribute_logic_description")}
        </span>
        <div className="mt-2">
          {route.fallbackAttributesQueryBuilderState &&
            attributesQueryBuilderConfigWithRaqbSettingsAndWidgets && (
              <Query
                {...attributesQueryBuilderConfigWithRaqbSettingsAndWidgets}
                value={route.fallbackAttributesQueryBuilderState.tree}
                onChange={(immutableTree, attributesQueryBuilderConfig) => {
                  onChangeFallbackTeamMembersQuery(
                    route,
                    immutableTree,
                    attributesQueryBuilderConfig as unknown as AttributesQueryBuilderConfigWithRaqbFields
                  );
                }}
                renderBuilder={renderBuilder}
              />
            )}
        </div>
      </div>
    ) : null;

  return (
    <FormCard
      className="mb-6"
      moveUp={moveUp}
      moveDown={moveDown}
      label={route.name ?? (route.isFallback ? "Fallback Route" : `Route ${index + 1}`)}
      isLabelEditable={!route.isFallback}
      onLabelChange={(label) => {
        setRoute(route.id, { name: label });
      }}
      deleteField={{
        check: () => routes.length !== 1 && !route.isFallback,
        fn: () => {
          const newRoutes = routes.filter((r) => r.id !== route.id);
          setRoutes(newRoutes);
        },
      }}>
      <div className="mb-4 flex w-full items-center sm:mx-0">
        <div className="cal-query-builder w-full ">
          {formFieldsQueryBuilder}
          <div>
            <div className="flex w-full flex-col gap-2 text-sm lg:flex-row">
              <div className="flex flex-grow items-center gap-2">
                <div className="flex flex-grow-0 whitespace-nowrap">
                  <span>{t("send_booker_to")}</span>
                </div>
                <Select
                  isDisabled={disabled}
                  className="data-testid-select-routing-action block w-full flex-grow"
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
              </div>
              {route.action?.type ? (
                route.action?.type === "customPageMessage" ? (
                  <TextArea
                    required
                    disabled={disabled}
                    name="customPageMessage"
                    className="border-default flex flex-grow lg:w-fit"
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                  />
                ) : route.action?.type === "externalRedirectUrl" ? (
                  <TextField
                    disabled={disabled}
                    name="externalRedirectUrl"
                    className="border-default flex flex-grow text-sm"
                    containerClassName="flex-grow"
                    type="url"
                    required
                    labelSrOnly
                    value={route.action.value}
                    onChange={(e) => {
                      setRoute(route.id, { action: { ...route.action, value: e.target.value } });
                    }}
                    placeholder="https://example.com"
                  />
                ) : (
                  <div className="flex-grow">
                    <Select
                      required
                      className="data-testid-eventTypeRedirectUrl-select"
                      isDisabled={disabled}
                      options={eventTypeRedirectUrlOptions}
                      onChange={(option) => {
                        if (!option) {
                          return;
                        }
                        if (option.value !== "custom") {
                          setRoute(route.id, {
                            action: { ...route.action, value: option.value, eventTypeId: option.eventTypeId },
                            attributeRoutingConfig: {},
                          });
                          setCustomEventTypeSlug("");
                        } else {
                          setRoute(route.id, {
                            action: { ...route.action, value: "custom", eventTypeId: 0 },
                            attributeRoutingConfig: {},
                          });
                          setCustomEventTypeSlug("");
                        }
                      }}
                      value={eventTypeRedirectUrlSelectedOption}
                    />
                    {eventOptions.length !== 0 &&
                    route.action.value !== "" &&
                    (!eventOptions.find((eventOption) => eventOption.value === route.action.value) ||
                      customEventTypeSlug.length) ? (
                      <>
                        <TextField
                          disabled={disabled}
                          className="border-default flex w-full flex-grow text-sm"
                          containerClassName="flex-grow mt-2"
                          addOnLeading={eventTypePrefix}
                          required
                          value={customEventTypeSlug}
                          onChange={(e) => {
                            setCustomEventTypeSlug(e.target.value);
                            setRoute(route.id, {
                              action: { ...route.action, value: `${eventTypePrefix}${e.target.value}` },
                            });
                          }}
                          placeholder="event-url"
                        />
                        <div className="mt-2 ">
                          <p className="text-subtle text-xs">
                            {fieldIdentifiers.length
                              ? t("field_identifiers_as_variables_with_example", {
                                  variable: `{${fieldIdentifiers[0]}}`,
                                })
                              : t("field_identifiers_as_variables")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>
                )
              ) : null}
            </div>
            {attributesQueryBuilder}
            <Divider className="mb-6 mt-6" />
            {fallbackAttributesQueryBuilder}
          </div>
        </div>
      </div>
    </FormCard>
  );
};

const buildState = <
  T extends
    | {
        queryValue: FormFieldsQueryValue;
        config: FormFieldsQueryBuilderConfigWithRaqbFields;
      }
    | {
        queryValue: AttributesQueryValue;
        config: AttributesQueryBuilderConfigWithRaqbFields;
      }
>({
  queryValue,
  config,
}: T) => ({
  tree: QbUtils.checkTree(QbUtils.loadTree(queryValue as JsonTree), config as unknown as Config),
  config,
});

const deserializeRoute = ({
  route,
  formFieldsQueryBuilderConfig,
  attributesQueryBuilderConfig,
}: {
  route: Exclude<SerializableRoute, GlobalRoute>;
  formFieldsQueryBuilderConfig: FormFieldsQueryBuilderConfigWithRaqbFields;
  attributesQueryBuilderConfig: AttributesQueryBuilderConfigWithRaqbFields | null;
}): EditFormRoute => {
  const attributesQueryBuilderState =
    route.attributesQueryValue && attributesQueryBuilderConfig
      ? buildState({
          queryValue: route.attributesQueryValue,
          config: attributesQueryBuilderConfig,
        })
      : null;

  const fallbackAttributesQueryBuilderState =
    route.fallbackAttributesQueryValue && attributesQueryBuilderConfig
      ? buildState({
          queryValue: route.fallbackAttributesQueryValue,
          config: attributesQueryBuilderConfig,
        })
      : null;

  return {
    ...route,
    formFieldsQueryBuilderState: buildState({
      queryValue: route.queryValue,
      config: formFieldsQueryBuilderConfig,
    }),
    attributesQueryBuilderState,
    fallbackAttributesQueryBuilderState,
  };
};

function useRoutes({
  serializedRoutes,
  formFieldsQueryBuilderConfig,
  attributesQueryBuilderConfig,
  hookForm,
}: {
  serializedRoutes: SerializableRoute[] | null | undefined;
  formFieldsQueryBuilderConfig: FormFieldsQueryBuilderConfigWithRaqbFields;
  attributesQueryBuilderConfig: AttributesQueryBuilderConfigWithRaqbFields | null;
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
}) {
  const [routes, _setRoutes] = useState(() => {
    const transformRoutes = () => {
      const _routes = serializedRoutes || [getEmptyRoute()];
      _routes.forEach((r) => {
        if (isRouter(r)) return;

        // Add default empty queries to existing routes otherwise they won't have 'Add Rule' button for those RAQB queries.
        if (!r.queryValue?.id) {
          r.queryValue = getEmptyQueryValue() as LocalRoute["queryValue"];
        }

        if (!r.attributesQueryValue) {
          r.attributesQueryValue = getEmptyQueryValue() as LocalRoute["attributesQueryValue"];
        }

        if (!r.fallbackAttributesQueryValue) {
          r.fallbackAttributesQueryValue = getEmptyQueryValue() as LocalRoute["fallbackAttributesQueryValue"];
        }
      });
      return _routes;
    };

    return transformRoutes().map((route) => {
      if (isRouter(route)) return route;
      return deserializeRoute({
        route,
        formFieldsQueryBuilderConfig,
        attributesQueryBuilderConfig,
      });
    });
  });

  const setRoutes: typeof _setRoutes = (newRoutes) => {
    _setRoutes((routes) => {
      if (typeof newRoutes === "function") {
        const newRoutesValue = newRoutes(routes);
        hookForm.setValue("routes", getRoutesToSave(newRoutesValue));
        return newRoutesValue;
      }
      hookForm.setValue("routes", getRoutesToSave(newRoutes));
      return newRoutes;
    });

    function getRoutesToSave(routes: EditFormRoute[]) {
      return routes.map((route) => {
        if (isRouter(route)) {
          return route;
        }
        return {
          id: route.id,
          name: route.name,
          attributeRoutingConfig: route.attributeRoutingConfig,
          action: route.action,
          isFallback: route.isFallback,
          queryValue: route.queryValue,
          attributesQueryValue: route.attributesQueryValue,
          fallbackAttributesQueryValue: route.fallbackAttributesQueryValue,
        };
      });
    }
  };

  return { routes, setRoutes };
}

const Routes = ({
  form,
  hookForm,
  appUrl,
  attributes,
  eventTypesByGroup,
}: {
  form: inferSSRProps<typeof getServerSideProps>["form"];
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  appUrl: string;
  attributes: Attribute[] | null;
  eventTypesByGroup: EventTypesByGroup;
}) => {
  const { routes: serializedRoutes } = hookForm.getValues();
  const { t } = useLocale();

  const formFieldsQueryBuilderConfig = getQueryBuilderConfigForFormFields(hookForm.getValues());
  const attributesQueryBuilderConfig = attributes
    ? getQueryBuilderConfigForAttributes({
        attributes: attributes,
        dynamicOperandFields: hookForm.getValues().fields,
      })
    : null;

  const { routes, setRoutes } = useRoutes({
    serializedRoutes,
    formFieldsQueryBuilderConfig,
    attributesQueryBuilderConfig,
    hookForm,
  });

  const { data: allForms } = trpc.viewer.appRoutingForms.forms.useQuery();

  const notHaveAttributesQuery = ({ form }: { form: SerializableForm<App_RoutingForms_Form> }) => {
    return form.routes?.every((route) => {
      if (isRouter(route)) {
        return true;
      }
      return !route.attributesQueryValue;
    });
  };

  const availableRouters =
    allForms?.filtered
      .filter(({ form: router }) => {
        const routerValidInContext = areTheySiblingEntitites({
          entity1: {
            teamId: router.teamId ?? null,
            // group doesn't have userId. The query ensures that it belongs to the user only, if teamId isn't set. So, I am manually setting it to the form userId
            userId: router.userId,
          },
          entity2: {
            teamId: hookForm.getValues().teamId ?? null,
            userId: hookForm.getValues().userId,
          },
        });
        return router.id !== hookForm.getValues().id && routerValidInContext;
      })
      // We don't want to support picking forms that have attributes query. We can consider it later.
      // This is mainly because the Router picker feature is pretty much not used and we don't want to complicate things
      .filter(({ form }) => {
        return notHaveAttributesQuery({ form: form });
      })
      .map(({ form: router }) => {
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
    fallbackRoute = deserializeRoute({
      route: createFallbackRoute(),
      formFieldsQueryBuilderConfig,
      attributesQueryBuilderConfig,
    });
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

  const setRoute = (id: string, route: Partial<EditFormRoute>) => {
    const index = routes.findIndex((route) => route.id === id);
    const existingRoute = routes[index];
    const newRoutes = [...routes];
    newRoutes[index] = { ...existingRoute, ...route };
    setRoutes(newRoutes);
  };

  const setAttributeRoutingConfig = (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => {
    const existingRoute = routes.find((route) => route.id === id);
    if (!existingRoute) {
      throw new Error("Route not found");
    }

    const existingAttributeRoutingConfig =
      "attributeRoutingConfig" in existingRoute ? existingRoute.attributeRoutingConfig : {};

    setRoute(id, {
      attributeRoutingConfig: { ...existingAttributeRoutingConfig, ...attributeRoutingConfig },
    });
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

  const fields = hookForm.getValues("fields");

  const fieldIdentifiers = fields ? fields.map((field) => field.identifier ?? field.label) : [];

  return (
    <div className="bg-default border-subtle flex flex-col-reverse rounded-md border p-8 md:flex-row">
      <div ref={animationRef} className="w-full ltr:mr-2 rtl:ml-2">
        {mainRoutes.map((route, key) => {
          return (
            <Route
              form={form}
              appUrl={appUrl}
              key={route.id}
              formFieldsQueryBuilderConfig={formFieldsQueryBuilderConfig}
              attributesQueryBuilderConfig={attributesQueryBuilderConfig}
              route={route}
              fieldIdentifiers={fieldIdentifiers}
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
              setAttributeRoutingConfig={setAttributeRoutingConfig}
              setRoutes={setRoutes}
              eventTypesByGroup={eventTypesByGroup}
            />
          );
        })}
        <SelectField
          placeholder={t("select_a_router")}
          containerClassName="mb-6 data-testid-select-router"
          isOptionDisabled={(option) => !!option.isDisabled}
          label={t("add_a_new_route")}
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
                  formFieldsQueryBuilderState: buildState({
                    queryValue: newEmptyRoute.queryValue,
                    config: formFieldsQueryBuilderConfig,
                  }),
                  attributesQueryBuilderState:
                    attributesQueryBuilderConfig && newEmptyRoute.attributesQueryValue
                      ? buildState({
                          queryValue: newEmptyRoute.attributesQueryValue,
                          config: attributesQueryBuilderConfig,
                        })
                      : null,
                  fallbackAttributesQueryBuilderState:
                    attributesQueryBuilderConfig && newEmptyRoute.fallbackAttributesQueryValue
                      ? buildState({
                          queryValue: newEmptyRoute.fallbackAttributesQueryValue,
                          config: attributesQueryBuilderConfig,
                        })
                      : null,
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
                } as EditFormRoute,
              ]);
            }
          }}
        />

        <div>
          <Route
            form={form}
            formFieldsQueryBuilderConfig={formFieldsQueryBuilderConfig}
            attributesQueryBuilderConfig={attributesQueryBuilderConfig}
            route={fallbackRoute}
            routes={routes}
            setRoute={setRoute}
            setRoutes={setRoutes}
            appUrl={appUrl}
            fieldIdentifiers={fieldIdentifiers}
            setAttributeRoutingConfig={setAttributeRoutingConfig}
            eventTypesByGroup={eventTypesByGroup}
          />
        </div>
      </div>
    </div>
  );
};

function Page({
  hookForm,
  form,
  appUrl,
}: {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
}) {
  const { t } = useLocale();
  const values = hookForm.getValues();
  const { data: attributes, isPending: isAttributesLoading } =
    trpc.viewer.appRoutingForms.getAttributesForTeam.useQuery(
      { teamId: values.teamId! },
      { enabled: !!values.teamId }
    );

  const { data: eventTypesByGroup, isLoading: areEventsLoading } =
    trpc.viewer.eventTypes.getByViewer.useQuery({
      forRoutingForms: true,
    });

  // If hookForm hasn't been initialized, don't render anything
  // This is important here because some states get initialized which aren't reset when the hookForm is reset with the form values and they don't get the updated values
  if (!hookForm.getValues().id) {
    return null;
  }

  // Only team form needs attributes
  if (values.teamId) {
    if (isAttributesLoading) {
      return <div>Loading...</div>;
    }
    if (!attributes) {
      return <div>{t("something_went_wrong")}</div>;
    }
  }

  if (areEventsLoading) {
    return <div>Loading...</div>;
  }

  if (!eventTypesByGroup) {
    console.error("Events not available");
    return <div>{t("something_went_wrong")}</div>;
  }

  return (
    <div className="route-config">
      <Routes
        hookForm={hookForm}
        appUrl={appUrl}
        eventTypesByGroup={eventTypesByGroup}
        form={form}
        attributes={attributes || null}
      />
    </div>
  );
}

export default function RouteBuilder({
  form,
  appUrl,
  enrichedWithUserProfileForm,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      enrichedWithUserProfileForm={enrichedWithUserProfileForm}
      Page={Page}
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

export { getServerSideProps };
