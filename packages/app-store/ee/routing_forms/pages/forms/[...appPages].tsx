// TODO: i18n
import {
  TrashIcon,
  DotsHorizontalIcon,
  DuplicateIcon,
  PencilIcon,
  PlusIcon,
  LinkIcon,
  ExternalLinkIcon,
  CollectionIcon,
} from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

import classNames from "@calcom/lib/classNames";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import { Button, EmptyScreen, Tooltip } from "@calcom/ui";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/Dropdown";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import Shell from "@components/Shell";

import { getSerializableForm } from "../../utils";

export default function RoutingForms({
  forms,
  appUrl,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  const router = useRouter();

  const deleteMutation = trpc.useMutation("viewer.app_routing_forms.deleteForm", {
    onSuccess: () => {
      showToast("Form deleted", "success");
      router.replace(router.asPath);
    },
    onSettled: () => {
      utils.invalidateQueries(["viewer.app_routing_forms.forms"]);
    },
    onError: () => {
      showToast("Something went wrong", "error");
    },
  });
  const utils = trpc.useContext();
  const { t } = useLocale();

  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess: (_data, variables) => {
      utils.invalidateQueries("viewer.app_routing_forms.forms");
      router.push(`${appUrl}/form-edit/${variables.id}`);
    },
    onError: () => {
      showToast(`Something went wrong`, "error");
    },
  });
  const formId = uuidv4();

  function NewFormButton() {
    return (
      <Button
        onClick={() => {
          const form = {
            id: formId,
            name: `Form-${formId.slice(0, 8)}`,
          };
          mutation.mutate({ ...form, addFallback: true });
        }}
        data-testid="new-routing-form"
        StartIcon={PlusIcon}>
        New Form
      </Button>
    );
  }

  return (
    <Shell
      heading="Routing Forms"
      CTA={<NewFormButton />}
      subtitle="You can see all routing forms and create one here.">
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 w-full bg-gray-50 px-4 pb-2 sm:px-6 md:px-8">
          {!forms.length ? (
            <EmptyScreen
              Icon={CollectionIcon}
              headline="Create your first form"
              description="Forms enable you to allow a booker to connect with the right person or choose the right event, faster. It would work by taking inputs from the booker and using that data to route to the correct booker/event as configured by Cal user"
              button={<NewFormButton />}
            />
          ) : null}
          {forms.length ? (
            <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
              <ul data-testid="routing-forms-list" className="divide-y divide-neutral-200">
                {forms.map((form, index) => {
                  if (!form) {
                    return null;
                  }
                  const formLink = `${CAL_URL}/forms/${form.id}`;
                  const description = form.description || "";
                  const disabled = form.disabled;
                  form.routes = form.routes || [];
                  const fields = form.fields || [];
                  return (
                    <li key={index}>
                      <div
                        className={classNames(
                          "flex items-center justify-between hover:bg-neutral-50",
                          disabled ? "hover:bg-white" : ""
                        )}>
                        <div
                          className={classNames(
                            "group flex w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6",
                            disabled ? "hover:bg-white" : ""
                          )}>
                          <Link href={appUrl + "/form-edit/" + form.id}>
                            <a
                              className={classNames(
                                "flex-grow truncate text-sm",
                                disabled ? "pointer-events-none cursor-not-allowed opacity-30" : ""
                              )}>
                              <div className="font-medium text-neutral-900 ltr:mr-1 rtl:ml-1">
                                {form.name}
                              </div>
                              <div className="text-neutral-500 dark:text-white">
                                <h2 className="max-w-[280px] overflow-hidden text-ellipsis pb-2 opacity-60 sm:max-w-[500px]">
                                  {description.substring(0, 100)}
                                  {description.length > 100 && "..."}
                                </h2>
                                <div className="mt-2 text-neutral-500 dark:text-white">
                                  {fields.length} fields, {form.routes.length} routes &{" "}
                                  {form._count.responses} Responses
                                </div>
                              </div>
                            </a>
                          </Link>
                          <div className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-5 sm:flex">
                            <div
                              className={classNames(
                                "flex justify-between space-x-2 rtl:space-x-reverse ",
                                disabled && "pointer-events-none cursor-not-allowed"
                              )}>
                              <Tooltip content={t("preview") as string}>
                                <a
                                  href={formLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={classNames(
                                    "btn-icon appearance-none",
                                    disabled && " opacity-30"
                                  )}>
                                  <ExternalLinkIcon
                                    className={classNames("h-5 w-5", !disabled && "group-hover:text-black")}
                                  />
                                </a>
                              </Tooltip>

                              <Tooltip content={t("copy_link") as string}>
                                <button
                                  onClick={() => {
                                    showToast(t("link_copied"), "success");
                                    navigator.clipboard.writeText(formLink);
                                  }}
                                  className={classNames("btn-icon", disabled && " opacity-30")}>
                                  <LinkIcon
                                    className={classNames("h-5 w-5", !disabled && "group-hover:text-black")}
                                  />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                          <Dropdown>
                            <DropdownMenuTrigger className="h-10 w-10 cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900 focus:border-gray-300">
                              <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Link href={appUrl + "/form-edit/" + form.id} passHref={true}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    color="minimal"
                                    className={classNames("w-full rounded-none")}
                                    StartIcon={PencilIcon}>
                                    {t("edit")}
                                  </Button>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Button
                                  type="button"
                                  color="minimal"
                                  size="sm"
                                  className={classNames("hidden w-full rounded-none")}
                                  StartIcon={DuplicateIcon}>
                                  {t("duplicate")}
                                </Button>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="h-px bg-gray-200" />
                              <DropdownMenuItem>
                                <Button
                                  onClick={() => {
                                    deleteMutation.mutate({
                                      id: form.id,
                                    });
                                  }}
                                  color="warn"
                                  size="sm"
                                  StartIcon={TrashIcon}
                                  className="w-full rounded-none">
                                  {t("delete")}
                                </Button>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </Dropdown>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) {
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const forms = await prisma.app_RoutingForms_Form.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const serializableForms = forms.map((form) => getSerializableForm(form));

  return {
    props: {
      forms: serializableForms,
    },
  };
};
