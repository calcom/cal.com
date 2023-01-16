import { useAutoAnimate } from "@formkit/auto-animate/react";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, useEffect, useState } from "react";

import {
  CreateEventTypeButton,
  EventTypeDescriptionLazy as EventTypeDescription,
} from "@calcom/features/eventtypes/components";
import Shell from "@calcom/features/shell/Shell";
import { APP_NAME, CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc, TRPCClientError } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyScreen,
  Icon,
  showToast,
  Switch,
  Avatar,
  AvatarGroup,
  Tooltip,
} from "@calcom/ui";

import { withQuery } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";

import { EmbedButton, EmbedDialog } from "@components/Embed";
import SkeletonLoader from "@components/eventtype/SkeletonLoader";

import { ssrInit } from "@server/lib/ssr";

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];
type EventTypeGroupProfile = EventTypeGroups[number]["profile"];

interface EventTypeListHeadingProps {
  profile: EventTypeGroupProfile;
  membershipCount: number;
  teamId?: number | null;
}

type EventTypeGroup = EventTypeGroups[number];
type EventType = EventTypeGroup["eventTypes"][number];
interface EventTypeListProps {
  group: EventTypeGroup;
  groupIndex: number;
  readOnly: boolean;
  types: EventType[];
}

const Item = ({ type, group, readOnly }: { type: EventType; group: EventTypeGroup; readOnly: boolean }) => {
  const { t } = useLocale();

  return (
    <Link
      href={`/event-types/${type.id}?tabName=setup`}
      className="flex-1 overflow-hidden pr-4 text-sm"
      title={`${type.title} ${type.description ? `– ${type.description}` : ""}`}>
      <div>
        <span
          className="font-semibold text-gray-700 ltr:mr-1 rtl:ml-1"
          data-testid={"event-type-title-" + type.id}>
          {type.title}
        </span>
        <small
          className="hidden font-normal leading-4 text-gray-600 sm:inline"
          data-testid={"event-type-slug-" + type.id}>{`/${group.profile.slug}/${type.slug}`}</small>
        {readOnly && (
          <span className="rtl:ml-2inline items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 ltr:ml-2 ltr:mr-2">
            {t("readonly")}
          </span>
        )}
      </div>
      <EventTypeDescription eventType={type} />
    </Link>
  );
};

const MemoizedItem = React.memo(Item);

export const EventTypeList = ({ group, groupIndex, readOnly, types }: EventTypeListProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogTypeId, setDeleteDialogTypeId] = useState(0);
  const utils = trpc.useContext();
  const mutation = trpc.viewer.eventTypeOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      await utils.viewer.eventTypes.getByViewer.cancel();
      // REVIEW: Should we invalidate the entire router or just the `getByViewer` query?
      await utils.viewer.eventTypes.invalidate();
    },
    onSettled: () => {
      // REVIEW: Should we invalidate the entire router or just the `getByViewer` query?
      utils.viewer.eventTypes.invalidate();
    },
  });

  const setHiddenMutation = trpc.viewer.eventTypes.update.useMutation({
    onMutate: async ({ id }) => {
      await utils.viewer.eventTypes.getByViewer.cancel();
      const previousValue = utils.viewer.eventTypes.getByViewer.getData();
      if (previousValue) {
        const newList = [...types];
        const itemIndex = newList.findIndex((item) => item.id === id);
        if (itemIndex !== -1 && newList[itemIndex]) {
          newList[itemIndex].hidden = !newList[itemIndex].hidden;
        }
        utils.viewer.eventTypes.getByViewer.setData(undefined, {
          ...previousValue,
          eventTypeGroups: [
            ...previousValue.eventTypeGroups.slice(0, groupIndex),
            { ...group, eventTypes: newList },
            ...previousValue.eventTypeGroups.slice(groupIndex + 1),
          ],
        });
      }
      return { previousValue };
    },
    onError: async (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getByViewer.setData(undefined, context.previousValue);
      }
      console.error(err.message);
    },
    onSettled: () => {
      // REVIEW: Should we invalidate the entire router or just the `getByViewer` query?
      utils.viewer.eventTypes.invalidate();
    },
  });

  async function moveEventType(index: number, increment: 1 | -1) {
    const newList = [...types];

    const type = types[index];
    const tmp = types[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }

    await utils.viewer.eventTypes.getByViewer.cancel();

    const previousValue = utils.viewer.eventTypes.getByViewer.getData();
    if (previousValue) {
      utils.viewer.eventTypes.getByViewer.setData(undefined, {
        ...previousValue,
        eventTypeGroups: [
          ...previousValue.eventTypeGroups.slice(0, groupIndex),
          { ...group, eventTypes: newList },
          ...previousValue.eventTypeGroups.slice(groupIndex + 1),
        ],
      });
    }

    mutation.mutate({
      ids: newList.map((type) => type.id),
    });
  }

  async function deleteEventTypeHandler(id: number) {
    const payload = { id };
    deleteMutation.mutate(payload);
  }

  // inject selection data into url for correct router history
  const openDuplicateModal = (eventType: EventType) => {
    const query = {
      ...router.query,
      dialog: "duplicate-event-type",
      title: eventType.title,
      description: eventType.description,
      slug: eventType.slug,
      id: eventType.id,
      length: eventType.length,
    };

    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: () => {
      showToast(t("event_type_deleted_successfully"), "success");
      setDeleteDialogOpen(false);
    },
    onMutate: async ({ id }) => {
      await utils.viewer.eventTypes.getByViewer.cancel();
      const previousValue = utils.viewer.eventTypes.getByViewer.getData();
      if (previousValue) {
        const newList = types.filter((item) => item.id !== id);

        utils.viewer.eventTypes.getByViewer.setData(undefined, {
          ...previousValue,
          eventTypeGroups: [
            ...previousValue.eventTypeGroups.slice(0, groupIndex),
            { ...group, eventTypes: newList },
            ...previousValue.eventTypeGroups.slice(groupIndex + 1),
          ],
        });
      }
      return { previousValue };
    },
    onError: (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getByViewer.setData(undefined, context.previousValue);
      }
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setDeleteDialogOpen(false);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
    onSettled: () => {
      // REVIEW: Should we invalidate the entire router or just the `getByViewer` query?
      utils.viewer.eventTypes.invalidate();
    },
  });

  const [isNativeShare, setNativeShare] = useState(true);

  useEffect(() => {
    if (!navigator.share) {
      setNativeShare(false);
    }
  }, []);

  const firstItem = types[0];
  const lastItem = types[types.length - 1];
  return (
    <div className="mb-16 flex overflow-hidden rounded-md border border-gray-200 bg-white">
      <ul ref={parent} className="!static w-full divide-y divide-neutral-200" data-testid="event-types">
        {types.map((type, index) => {
          const embedLink = `${group.profile.slug}/${type.slug}`;
          const calLink = `${CAL_URL}/${embedLink}`;
          return (
            <li key={type.id}>
              <div className="flex w-full items-center justify-between hover:bg-gray-50">
                <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
                  {!(firstItem && firstItem.id === type.id) && (
                    <button
                      className="invisible absolute left-[5px] -mt-4 mb-4 -ml-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex lg:left-[36px]"
                      onClick={() => moveEventType(index, -1)}>
                      <Icon.FiArrowUp className="h-5 w-5" />
                    </button>
                  )}

                  {!(lastItem && lastItem.id === type.id) && (
                    <button
                      className="invisible absolute left-[5px] mt-8 -ml-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md  border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex lg:left-[36px]"
                      onClick={() => moveEventType(index, 1)}>
                      <Icon.FiArrowDown className="h-5 w-5" />
                    </button>
                  )}
                  <MemoizedItem type={type} group={group} readOnly={readOnly} />
                  <div className="mt-4 hidden sm:mt-0 sm:flex">
                    <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                      {type.users?.length > 1 && (
                        <AvatarGroup
                          className="relative top-1 right-3"
                          size="sm"
                          truncateAfter={4}
                          items={type.users.map((organizer) => ({
                            alt: organizer.name || "",
                            image: `${WEBAPP_URL}/${organizer.username}/avatar.png`,
                            title: organizer.name || "",
                          }))}
                        />
                      )}
                      <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                        {type.hidden && (
                          <Badge variant="gray" size="lg">
                            {t("hidden")}
                          </Badge>
                        )}
                        <Tooltip content={t("show_eventtype_on_profile")}>
                          <div className="self-center rounded-md p-2 hover:bg-gray-200">
                            <Switch
                              name="Hidden"
                              checked={!type.hidden}
                              onCheckedChange={() => {
                                setHiddenMutation.mutate({ id: type.id, hidden: !type.hidden });
                              }}
                            />
                          </div>
                        </Tooltip>

                        <ButtonGroup combined>
                          <Tooltip content={t("preview")}>
                            <Button
                              color="secondary"
                              target="_blank"
                              size="icon"
                              href={calLink}
                              StartIcon={Icon.FiExternalLink}
                            />
                          </Tooltip>

                          <Tooltip content={t("copy_link")}>
                            <Button
                              color="secondary"
                              size="icon"
                              StartIcon={Icon.FiLink}
                              onClick={() => {
                                showToast(t("link_copied"), "success");
                                navigator.clipboard.writeText(calLink);
                              }}
                            />
                          </Tooltip>
                          <Dropdown modal={false}>
                            <DropdownMenuTrigger
                              asChild
                              data-testid={"event-type-options-" + type.id}
                              className="radix-state-open:rounded-r-md">
                              <Button
                                type="button"
                                size="icon"
                                color="secondary"
                                StartIcon={Icon.FiMoreHorizontal}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <DropdownItem
                                  type="button"
                                  data-testid={"event-type-edit-" + type.id}
                                  StartIcon={Icon.FiEdit2}
                                  onClick={() => router.push("/event-types/" + type.id)}>
                                  {t("edit")}
                                </DropdownItem>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="outline-none">
                                <DropdownItem
                                  type="button"
                                  data-testid={"event-type-duplicate-" + type.id}
                                  StartIcon={Icon.FiCopy}
                                  onClick={() => openDuplicateModal(type)}>
                                  {t("duplicate")}
                                </DropdownItem>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="outline-none">
                                <EmbedButton
                                  as={DropdownItem}
                                  type="button"
                                  StartIcon={Icon.FiCode}
                                  className="w-full rounded-none"
                                  embedUrl={encodeURIComponent(embedLink)}>
                                  {t("embed")}
                                </EmbedButton>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                              {(group.metadata?.readOnly === false || group.metadata.readOnly === null) && (
                                <DropdownMenuItem>
                                  <DropdownItem
                                    color="destructive"
                                    onClick={() => {
                                      setDeleteDialogOpen(true);
                                      setDeleteDialogTypeId(type.id);
                                    }}
                                    StartIcon={Icon.FiTrash}
                                    className="w-full rounded-none">
                                    {t("delete")}
                                  </DropdownItem>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </Dropdown>
                        </ButtonGroup>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-w-9 mx-5 flex sm:hidden">
                  <Dropdown>
                    <DropdownMenuTrigger asChild data-testid={"event-type-options-" + type.id}>
                      <Button type="button" size="icon" color="secondary" StartIcon={Icon.FiMoreHorizontal} />
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent>
                        <DropdownMenuItem className="outline-none">
                          <Link href={calLink} target="_blank">
                            <Button
                              color="minimal"
                              StartIcon={Icon.FiExternalLink}
                              className="w-full rounded-none">
                              {t("preview")}
                            </Button>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="outline-none">
                          <Button
                            type="button"
                            color="minimal"
                            className="w-full rounded-none text-left"
                            data-testid={"event-type-duplicate-" + type.id}
                            StartIcon={Icon.FiClipboard}
                            onClick={() => {
                              navigator.clipboard.writeText(calLink);
                              showToast(t("link_copied"), "success");
                            }}>
                            {t("copy_link")}
                          </Button>
                        </DropdownMenuItem>
                        {isNativeShare ? (
                          <DropdownMenuItem className="outline-none">
                            <Button
                              type="button"
                              color="minimal"
                              className="w-full rounded-none"
                              data-testid={"event-type-duplicate-" + type.id}
                              StartIcon={Icon.FiUpload}
                              onClick={() => {
                                navigator
                                  .share({
                                    title: t("share"),
                                    text: t("share_event", { appName: APP_NAME }),
                                    url: calLink,
                                  })
                                  .then(() => showToast(t("link_shared"), "success"))
                                  .catch(() => showToast(t("failed"), "error"));
                              }}>
                              {t("share")}
                            </Button>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem className="outline-none">
                          <Button
                            type="button"
                            onClick={() => router.push("/event-types/" + type.id)}
                            color="minimal"
                            className="w-full rounded-none"
                            StartIcon={Icon.FiEdit}>
                            {t("edit")}
                          </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="outline-none">
                          <Button
                            type="button"
                            color="minimal"
                            className="w-full rounded-none"
                            data-testid={"event-type-duplicate-" + type.id}
                            StartIcon={Icon.FiCopy}
                            onClick={() => openDuplicateModal(type)}>
                            {t("duplicate")}
                          </Button>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="outline-none">
                          <Button
                            onClick={() => {
                              setDeleteDialogOpen(true);
                              setDeleteDialogTypeId(type.id);
                            }}
                            color="destructive"
                            StartIcon={Icon.FiTrash}
                            className="w-full rounded-none">
                            {t("delete")}
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenuPortal>
                  </Dropdown>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_event_type")}
          confirmBtnText={t("confirm_delete_event_type")}
          loadingText={t("confirm_delete_event_type")}
          onConfirm={(e) => {
            e.preventDefault();
            deleteEventTypeHandler(deleteDialogTypeId);
          }}>
          {t("delete_event_type_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

const EventTypeListHeading = ({
  profile,
  membershipCount,
  teamId,
}: EventTypeListHeadingProps): JSX.Element => {
  return (
    <div className="mb-4 flex items-center space-x-2">
      <Link href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}>
        <Avatar
          alt={profile?.name || ""}
          imageSrc={`${WEBAPP_URL}/${profile.slug}/avatar.png` || undefined}
          size="sm"
          className="mt-1 inline ltr:mr-2 rtl:ml-2"
        />
      </Link>
      <div>
        <Link
          href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}
          className="font-bold">
          {profile?.name || ""}
        </Link>
        {membershipCount && teamId && (
          <span className="relative -top-px text-xs text-gray-500 ltr:ml-2 ltr:mr-2 rtl:ml-2">
            <Link href={`/settings/teams/${teamId}/members`}>
              <Badge variant="gray">
                <Icon.FiUsers className="mr-1 -mt-px inline h-3 w-3" />
                {membershipCount}
              </Badge>
            </Link>
          </span>
        )}
        {profile?.slug && (
          <Link href={`${CAL_URL}/${profile.slug}`} className="block text-xs text-gray-500">
            {`${CAL_URL?.replace("https://", "")}/${profile.slug}`}
          </Link>
        )}
      </div>
    </div>
  );
};

const CreateFirstEventTypeView = () => {
  const { t } = useLocale();

  return (
    <EmptyScreen
      Icon={Icon.FiLink}
      headline={t("new_event_type_heading")}
      description={t("new_event_type_description")}
    />
  );
};

const CTA = () => {
  const query = trpc.viewer.eventTypes.getByViewer.useQuery();

  if (!query.data) return null;

  return <CreateEventTypeButton canAddEvents={true} options={query.data.profiles} />;
};

const WithQuery = withQuery(trpc.viewer.eventTypes.getByViewer);

const EventTypesPage = () => {
  const { t } = useLocale();

  return (
    <div>
      <Shell heading={t("event_types_page_title")} subtitle={t("event_types_page_subtitle")} CTA={<CTA />}>
        <WithQuery
          customLoader={<SkeletonLoader />}
          success={({ data }) => (
            <>
              {data.eventTypeGroups.map((group, index) => (
                <Fragment key={group.profile.slug}>
                  {/* hide list heading when there is only one (current user) */}
                  {(data.eventTypeGroups.length !== 1 || group.teamId) && (
                    <EventTypeListHeading
                      profile={group.profile}
                      membershipCount={group.metadata.membershipCount}
                      teamId={group.teamId}
                    />
                  )}
                  <EventTypeList
                    types={group.eventTypes}
                    group={group}
                    groupIndex={index}
                    readOnly={group.metadata.readOnly}
                  />
                </Fragment>
              ))}

              {data.eventTypeGroups.length === 0 && <CreateFirstEventTypeView />}
              <EmbedDialog />
            </>
          )}
        />
      </Shell>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default EventTypesPage;
