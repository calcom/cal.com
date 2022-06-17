import jsonLogic from "json-logic-js";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";
import { Toaster } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";
import { Form, Label } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import { getQueryBuilderConfig } from "../route-builder/[...appPages]";

function RoutingForm({ form }) {
  const [customPageMessage, setCustomPageMessage] = useState(null);
  const formFillerIdRef = useRef(null);
  const formFillerId = formFillerIdRef.current;
  useEffect(() => {
    const formFillerId = uuidv4();
    // TODO: We might want to prevent spam from a single user.
    // Technically, a user can fill form multiple times due to any number of reasons
    // - like a network error
    // - or he abandoned booking flow in between
    formFillerIdRef.current = formFillerId;
  }, []);

  const router = useRouter();

  const onSubmit = (response) => {
    const decidedAction = processRoute({ form, response });
    if (decidedAction.type === "customPageMessage") {
      setCustomPageMessage(decidedAction.value);
    } else if (decidedAction.type === "eventTypeRedirectUrl") {
      router.push(`/${decidedAction.value}`);
    } else if (decidedAction.type === "externalRedirectUrl") {
      window.location.href = decidedAction.value;
    }
    responseMutation.mutate({
      formId,
      formFillerId,
      response: response,
    });
  };

  const responseMutation = trpc.useMutation("viewer.app_routing_forms.response", {
    onSuccess: () => {
      showToast("Form submitted successfully! Redirecting now ...", "success");
    },
    onError: (e) => {
      if (e?.data.code === "CONFLICT") {
        showToast("Form already submitted", "error");
        return;
      }
      showToast("Something went wrong", "error");
    },
  });

  const [_response, setResponse] = useState({});

  const response = {};

  form.fields.forEach((field) => {
    response[field.id] = _response[field.id] || "";
  });

  const queryBuilderConfig = getQueryBuilderConfig(form);

  const handleOnSubmit = (e) => {
    e.preventDefault();
    onSubmit(response);
  };

  return !customPageMessage ? (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
          <Toaster position="bottom-right" />

          <form onSubmit={handleOnSubmit}>
            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              {form.name}
            </h1>
            {form.description ? (
              <p className="min-h-10 text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">{form.description}</p>
            ) : null}
            {form.fields.map((field) => {
              const Component = queryBuilderConfig.widgets[field.type].factory;

              const optionValues = field.selectText?.trim().split("\n");
              const options = optionValues?.map((value) => {
                const title = value;
                return {
                  value,
                  title,
                };
              });

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
                        required={field.required}
                        listValues={options}
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
              <Button
                loading={responseMutation.isLoading}
                type="submit"
                data-testid="update-eventtype"
                className="dark:text-darkmodebrandcontrast text-brandcontrast bg-brand dark:bg-darkmodebrand relative inline-flex items-center rounded-sm border border-transparent px-3 py-2 text-sm font-medium hover:bg-opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-1">
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ) : (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
          <div>{customPageMessage}</div>
        </div>
      </div>
    </div>
  );
}

function processRoute({ form, response = {} }) {
  const queryBuilderConfig = getQueryBuilderConfig(form);
  const routes = form.routes || [];
  let decidedAction = null;
  const reorderedRoutes = routes
    .filter((route) => !route.isFallback)
    .concat([routes.find((route) => route.isFallback)]);

  reorderedRoutes.some((route) => {
    const state = {
      tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), queryBuilderConfig),
      config: queryBuilderConfig,
    };
    const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
    const logic = jsonLogicQuery.logic;
    let result = false;
    if (logic) {
      result = jsonLogic.apply(logic as any, response);
    } else {
      // If no logic is provided, then consider it a match
      result = true;
    }
    if (result) {
      decidedAction = route.action;
      return true;
    }
  });

  return decidedAction;
}

export default function RoutingLink({ form }) {
  return <RoutingForm form={form}></RoutingForm>;
}

export async function getServerSideProps(context: GetServerSidePropsContext, prisma) {
  const { req, query } = context;
  const formId = query.appPages[0];
  if (!formId || query.appPages.length > 1) {
    return {
      notFound: true,
    };
  }
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
  });

  if (!form || form.disabled) {
    return {
      notFound: true,
    };
  }
  form.createdAt = form.createdAt.toString();
  form.updatedAt = form.updatedAt.toString();

  return {
    props: {
      form,
    },
  };
}
