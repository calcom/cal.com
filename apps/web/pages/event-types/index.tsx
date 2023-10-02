import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { User } from "@prisma/client";
import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FC } from "react";
import { memo, useEffect, useState } from "react";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import useIntercom from "@calcom/features/ee/support/lib/intercom/useIntercom";
import { EventTypeEmbedButton, EventTypeEmbedDialog } from "@calcom/features/embed/EventTypeEmbed";
import {
  CreateEventTypeDialog,
  EventTypeDescriptionLazy as EventTypeDescription,
} from "@calcom/features/eventtypes/components";
import { DuplicateDialog } from "@calcom/features/eventtypes/components/DuplicateDialog";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { ShellMain } from "@calcom/features/shell/Shell";
import { APP_NAME, CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import {
  Alert,
  Avatar,
  AvatarGroup,
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
  HeadSeo,
  HorizontalTabs,
  Label,
  showToast,
  Skeleton,
  Switch,
  Tooltip,
  ArrowButton,
  CreateButtonWithTeamsList,
} from "@calcom/ui";
import {
  Clipboard,
  Code,
  Copy,
  Edit,
  Edit2,
  ExternalLink,
  Link as LinkIcon,
  MoreHorizontal,
  Trash,
  Upload,
  User as UserIcon,
  Users,
} from "@calcom/ui/components/icon";

import useMeQuery from "@lib/hooks/useMeQuery";

import PageWrapper from "@components/PageWrapper";
import SkeletonLoader from "@components/eventtype/SkeletonLoader";

interface EventTypeListHeadingProps {
  teamSlugOrUsername: string;
  teamNameOrUserName: string;
  membershipCount: number;
  teamId?: number | null;
  orgSlug?: string;
}

type EventTypeList = RouterOutputs["viewer"]["eventTypes"]["paginate"];
type EventType = EventTypeList[number];

interface EventTypeListProps {
  data: EventTypeList;
  readonly?: boolean;
}

interface MobileTeamsTabProps {
  teamEventTypes: EventTypeList[];
  readonly?: boolean;
}

const querySchema = z.object({
  teamId: z.nullable(z.coerce.number()).optional().default(null),
});

const MobileTeamsTab: FC<MobileTeamsTabProps> = (props: MobileTeamsTabProps) => {
  const { teamEventTypes, readonly } = props;
  const orgBranding = useOrgBranding();
  const tabs = teamEventTypes
    .filter((item) => item !== undefined)
    .map((item) => {
      const [firstElement] = item;

      const [mainUser] = firstElement?.users ?? [];
      const teamSlugOrUsername = firstElement?.team?.slug || mainUser?.username || "";
      const teamNameOrUserName = firstElement?.team?.name || mainUser?.name || "";
      const teamId = firstElement?.team?.id;
      return {
        name: teamNameOrUserName,
        href: teamId ? `/event-types?teamId=${teamId}` : "/event-types",
        avatar: teamId
          ? `${orgBranding?.fullDomain ?? WEBAPP_URL}/${teamSlugOrUsername}/avatar.png`
          : `${WEBAPP_URL}/${teamSlugOrUsername}/avatar.png`,
      };
    });
  const { data } = useTypedQuery(querySchema);
  const eventsIndex = teamEventTypes.findIndex((item) => item[0]?.team?.id === data?.teamId);

  const events = teamEventTypes[eventsIndex > -1 ? eventsIndex : 0];

  return (
    <div>
      <HorizontalTabs tabs={tabs} />
      {events && events.length > 0 ? (
        <EventTypeList data={events} readonly={readonly} />
      ) : (
        // @TODO: fix later when we have the context provider
        <CreateFirstEventTypeView slug="" />
      )}
    </div>
  );
};

const getEventTypeSlug = (eventType: EventType, t: TFunction) => {
  const { team, schedulingType, users } = eventType;

  if (team?.slug) {
    return `/${team.slug}/${eventType.slug}`;
  } else if (schedulingType === SchedulingType.MANAGED) {
    return t("username_placeholder");
  } else {
    return `/${users[0].username}/${eventType.slug}`;
  }
};

const Item = ({ eventType, readonly }: { eventType: EventType; readonly?: boolean }) => {
  const { t } = useLocale();

  const content = () => (
    <div>
      <span
        className="text-default font-semibold ltr:mr-1 rtl:ml-1"
        data-testid={"event-type-title-" + eventType.id}>
        {eventType.title}
      </span>

      <small
        className="text-subtle hidden font-normal leading-4 sm:inline"
        data-testid={"event-type-slug-" + eventType.id}>
        {getEventTypeSlug(eventType, t)}
      </small>

      {readonly && (
        <Badge variant="gray" className="ml-2">
          {t("readonly")}
        </Badge>
      )}
    </div>
  );

  return readonly ? (
    <div className="flex-1 overflow-hidden pr-4 text-sm">
      {content()}
      <EventTypeDescription
        // @ts-expect-error FIXME: We have a type mismatch here @hariombalhara @sean-brydon
        eventType={eventType}
        shortenDescription
      />
    </div>
  ) : (
    <Link
      href={`/event-types/${eventType?.id}?tabName=setup`}
      className="flex-1 overflow-hidden pr-4 text-sm"
      title={eventType?.title}>
      <div>
        <span
          className="text-default font-semibold ltr:mr-1 rtl:ml-1"
          data-testid={"event-type-title-" + eventType?.id}>
          {eventType?.title}
        </span>

        <small
          className="text-subtle hidden font-normal leading-4 sm:inline"
          data-testid={"event-type-slug-" + eventType?.id}>
          {getEventTypeSlug(eventType, t)}
        </small>

        {readonly && (
          <Badge variant="gray" className="ml-2">
            {t("readonly")}
          </Badge>
        )}
      </div>
      <EventTypeDescription
        // @ts-expect-error FIXME: We have a type mismatch here @hariombalhara @sean-brydon
        eventType={{
          ...eventType,
          descriptionAsSafeHTML: eventType?.description ? markdownToSafeHTML(eventType?.description) : "",
        }}
        shortenDescription
      />
    </Link>
  );
};

const MemoizedItem = memo(Item);

export const EventTypeList = ({ data, readonly }: EventTypeListProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgBranding = useOrgBranding();
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogTypeId, setDeleteDialogTypeId] = useState(0);
  const [deleteDialogTypeSchedulingType, setDeleteDialogSchedulingType] = useState<SchedulingType | null>(
    null
  );
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
        const newList = [...data];
        const itemIndex = newList.findIndex((item) => item.id === id);
        if (itemIndex !== -1 && newList[itemIndex]) {
          newList[itemIndex].hidden = !newList[itemIndex].hidden;
        }
        utils.viewer.eventTypes.getByViewer.setData(undefined, {
          ...previousValue,
          // eventTypeGroups: [
          //   ...previousValue.eventTypeGroups.slice(0, groupIndex),
          //   { ...group, eventTypes: newList },
          //   ...previousValue.eventTypeGroups.slice(groupIndex + 1),
          // ],
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
    const newList = [...data];

    const type = data[index];
    const tmp = data[index + increment];
    if (tmp) {
      newList[index] = tmp;
      newList[index + increment] = type;
    }

    await utils.viewer.eventTypes.getByViewer.cancel();

    const previousValue = utils.viewer.eventTypes.getByViewer.getData();
    if (previousValue) {
      utils.viewer.eventTypes.getByViewer.setData(undefined, {
        ...previousValue,
        // eventTypeGroups: [
        //   ...previousValue.eventTypeGroups.slice(0, groupIndex),
        //   { ...group, eventTypes: newList },
        //   ...previousValue.eventTypeGroups.slice(groupIndex + 1),
        // ],
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
    const newSearchParams = new URLSearchParams(searchParams);
    function setParamsIfDefined(key: string, value: string | number | boolean | null | undefined) {
      if (value) newSearchParams.set(key, value.toString());
      if (value === null) newSearchParams.delete(key);
    }
    setParamsIfDefined("dialog", "duplicate");
    setParamsIfDefined("title", eventType.title);
    setParamsIfDefined("description", eventType.description);
    setParamsIfDefined("slug", eventType.slug);
    setParamsIfDefined("id", eventType.id);
    setParamsIfDefined("length", eventType.length);
    setParamsIfDefined("pageSlug", getEventTypeSlug(eventType, t));
    router.push(`${pathname}?${newSearchParams.toString()}`);
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
        // const newList = data.filter((item) => item.id !== id);

        utils.viewer.eventTypes.getByViewer.setData(undefined, {
          ...previousValue,
          // eventTypeGroups: [
          //   ...previousValue.eventTypeGroups.slice(0, groupIndex),
          //   { ...group, eventTypes: newList },
          //   ...previousValue.eventTypeGroups.slice(groupIndex + 1),
          // ],
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

  // @TODO: Fix later after we have the context provider
  // if (!data.length) {
  //   return data[0].teamId ? (
  //     <EmptyEventTypeList teamId={data[0].teamId} teamSlugOrUsername={data[0].team.slug || ""} />
  //   ) : (
  //     <CreateFirstEventTypeView slug={data[0].team.slug || []} />
  //   );
  // }

  const firstItem = data[0];
  const lastItem = data[data.length - 1];
  const isManagedEventPrefix = () => {
    return deleteDialogTypeSchedulingType === SchedulingType.MANAGED ? "_managed" : "";
  };
  return (
    <div className="bg-default border-subtle mb-16 flex overflow-hidden rounded-md border">
      <ul ref={parent} className="divide-subtle !static w-full divide-y" data-testid="event-types">
        {data.map((eventType, index) => {
          const embedLink = `${eventType?.team?.slug || eventType.users[0].username}/${eventType.slug}`;
          const calLink = `${orgBranding?.fullDomain ?? CAL_URL}/${embedLink}`;

          const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;

          const isChildrenManagedEventType = !!eventType.parentId;
          const isReadOnly = readonly || isChildrenManagedEventType;
          const hosts = !!eventType?.hosts?.length
            ? eventType?.hosts.map((user) => user.user)
            : eventType.users;
          return (
            <li key={eventType.id}>
              <div className="hover:bg-muted flex w-full items-center justify-between">
                <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
                  {!(firstItem && firstItem.id === eventType.id) && (
                    <ArrowButton onClick={() => moveEventType(index, -1)} arrowDirection="up" />
                  )}
                  {!(lastItem && lastItem.id === eventType.id) && (
                    <ArrowButton onClick={() => moveEventType(index, 1)} arrowDirection="down" />
                  )}
                  <MemoizedItem eventType={eventType} readonly={isReadOnly} />
                  <div className="mt-4 hidden sm:mt-0 sm:flex">
                    <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                      {eventType.team && !isManagedEventType && (
                        <AvatarGroup
                          className="relative right-3 top-1"
                          size="sm"
                          truncateAfter={4}
                          items={hosts.map((organizer: { name: string | null; username: string | null }) => ({
                            alt: organizer.name || "",
                            image: `${orgBranding?.fullDomain ?? WEBAPP_URL}/${
                              organizer.username
                            }/avatar.png`,
                            title: organizer.name || "",
                          }))}
                        />
                      )}
                      {isManagedEventType && eventType.children?.length > 0 && (
                        <AvatarGroup
                          className="relative right-3 top-1"
                          size="sm"
                          truncateAfter={4}
                          items={eventType.children.map(
                            ({ users }: { users: Pick<User, "name" | "username">[] }) => ({
                              alt: users[0].name || "",
                              image: `${orgBranding?.fullDomain ?? WEBAPP_URL}/${
                                users[0].username
                              }/avatar.png`,
                              title: users[0].name || "",
                            })
                          )}
                        />
                      )}
                      <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                        {!isManagedEventType && (
                          <>
                            {eventType.hidden && <Badge variant="gray">{t("hidden")}</Badge>}
                            <Tooltip
                              content={
                                eventType.hidden ? t("show_eventtype_on_profile") : t("hide_from_profile")
                              }>
                              <div className="self-center rounded-md p-2">
                                <Switch
                                  name="Hidden"
                                  checked={!eventType.hidden}
                                  onCheckedChange={() => {
                                    setHiddenMutation.mutate({ id: eventType.id, hidden: !eventType.hidden });
                                  }}
                                />
                              </div>
                            </Tooltip>
                          </>
                        )}

                        <ButtonGroup combined>
                          {!isManagedEventType && (
                            <>
                              <Tooltip content={t("preview")}>
                                <Button
                                  data-testid="preview-link-button"
                                  color="secondary"
                                  target="_blank"
                                  variant="icon"
                                  href={calLink}
                                  StartIcon={ExternalLink}
                                />
                              </Tooltip>

                              <Tooltip content={t("copy_link")}>
                                <Button
                                  color="secondary"
                                  variant="icon"
                                  StartIcon={LinkIcon}
                                  onClick={() => {
                                    showToast(t("link_copied"), "success");
                                    navigator.clipboard.writeText(calLink);
                                  }}
                                />
                              </Tooltip>
                            </>
                          )}
                          <Dropdown modal={isReadOnly}>
                            <DropdownMenuTrigger asChild data-testid={"event-type-options-" + eventType.id}>
                              <Button
                                type="button"
                                variant="icon"
                                color="secondary"
                                StartIcon={MoreHorizontal}
                                className="ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {!isReadOnly && (
                                <DropdownMenuItem>
                                  <DropdownItem
                                    type="button"
                                    data-testid={"event-type-edit-" + eventType.id}
                                    StartIcon={Edit2}
                                    onClick={() => router.push("/event-types/" + eventType.id)}>
                                    {t("edit")}
                                  </DropdownItem>
                                </DropdownMenuItem>
                              )}
                              {!isManagedEventType && !isChildrenManagedEventType && (
                                <>
                                  <DropdownMenuItem className="outline-none">
                                    <DropdownItem
                                      type="button"
                                      data-testid={"event-type-duplicate-" + eventType.id}
                                      StartIcon={Copy}
                                      onClick={() => openDuplicateModal(eventType)}>
                                      {t("duplicate")}
                                    </DropdownItem>
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isManagedEventType && (
                                <DropdownMenuItem className="outline-none">
                                  <EventTypeEmbedButton
                                    as={DropdownItem}
                                    type="button"
                                    StartIcon={Code}
                                    className="w-full rounded-none"
                                    embedUrl={encodeURIComponent(embedLink)}
                                    eventId={eventType.id}>
                                    {t("embed")}
                                  </EventTypeEmbedButton>
                                </DropdownMenuItem>
                              )}
                              {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                              {isReadOnly && !isChildrenManagedEventType && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <DropdownItem
                                      color="destructive"
                                      onClick={() => {
                                        setDeleteDialogOpen(true);
                                        setDeleteDialogTypeId(eventType.id);
                                        setDeleteDialogSchedulingType(eventType.schedulingType);
                                      }}
                                      StartIcon={Trash}
                                      className="w-full rounded-none">
                                      {t("delete")}
                                    </DropdownItem>
                                  </DropdownMenuItem>
                                </>
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
                    <DropdownMenuTrigger asChild data-testid={"event-type-options-" + eventType.id}>
                      <Button type="button" variant="icon" color="secondary" StartIcon={MoreHorizontal} />
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent>
                        {!isManagedEventType && (
                          <>
                            <DropdownMenuItem className="outline-none">
                              <DropdownItem
                                href={calLink}
                                target="_blank"
                                StartIcon={ExternalLink}
                                className="w-full rounded-none">
                                {t("preview")}
                              </DropdownItem>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="outline-none">
                              <DropdownItem
                                data-testid={"event-type-duplicate-" + eventType.id}
                                onClick={() => {
                                  navigator.clipboard.writeText(calLink);
                                  showToast(t("link_copied"), "success");
                                }}
                                StartIcon={Clipboard}
                                className="w-full rounded-none text-left">
                                {t("copy_link")}
                              </DropdownItem>
                            </DropdownMenuItem>
                          </>
                        )}
                        {isNativeShare ? (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              data-testid={"event-type-duplicate-" + eventType.id}
                              onClick={() => {
                                navigator
                                  .share({
                                    title: t("share"),
                                    text: t("share_event", { appName: APP_NAME }),
                                    url: calLink,
                                  })
                                  .then(() => showToast(t("link_shared"), "success"))
                                  .catch(() => showToast(t("failed"), "error"));
                              }}
                              StartIcon={Upload}
                              className="w-full rounded-none">
                              {t("share")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        ) : null}
                        {!isReadOnly && (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              onClick={() => router.push("/event-types/" + eventType.id)}
                              StartIcon={Edit}
                              className="w-full rounded-none">
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        )}
                        {!isManagedEventType && !isChildrenManagedEventType && (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              onClick={() => openDuplicateModal(eventType)}
                              StartIcon={Copy}
                              data-testid={"event-type-duplicate-" + eventType.id}>
                              {t("duplicate")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        )}
                        {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                        {isReadOnly && !isChildrenManagedEventType && (
                          <>
                            <DropdownMenuItem className="outline-none">
                              <DropdownItem
                                color="destructive"
                                onClick={() => {
                                  setDeleteDialogOpen(true);
                                  setDeleteDialogTypeId(eventType.id);
                                  setDeleteDialogSchedulingType(eventType.schedulingType);
                                }}
                                StartIcon={Trash}
                                className="w-full rounded-none">
                                {t("delete")}
                              </DropdownItem>
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        {!isManagedEventType && (
                          <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between px-4 py-2">
                            <Skeleton
                              as={Label}
                              htmlFor="hiddenSwitch"
                              className="mt-2 inline cursor-pointer self-center pr-2 ">
                              {eventType.hidden ? t("show_eventtype_on_profile") : t("hide_from_profile")}
                            </Skeleton>
                            <Switch
                              id="hiddenSwitch"
                              name="Hidden"
                              checked={!eventType.hidden}
                              onCheckedChange={() => {
                                setHiddenMutation.mutate({ id: eventType.id, hidden: !eventType.hidden });
                              }}
                            />
                          </div>
                        )}
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
          title={t(`delete${isManagedEventPrefix()}_event_type`)}
          confirmBtnText={t(`confirm_delete_event_type`)}
          loadingText={t(`confirm_delete_event_type`)}
          isLoading={deleteMutation.isLoading}
          onConfirm={(e) => {
            e.preventDefault();
            deleteEventTypeHandler(deleteDialogTypeId);
          }}>
          <p className="mt-5">
            <Trans
              i18nKey={`delete${isManagedEventPrefix()}_event_type_description`}
              components={{ li: <li />, ul: <ul className="ml-4 list-disc" /> }}>
              <ul>
                <li>Members assigned to this event type will also have their event types deleted.</li>
                <li>
                  Anyone who they&apos;ve shared their link with will no longer be able to book using it.
                </li>
              </ul>
            </Trans>
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

const EventTypeListHeading = ({
  teamSlugOrUsername,
  teamNameOrUserName,
  membershipCount,
  teamId,
}: EventTypeListHeadingProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const orgBranding = useOrgBranding();

  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data: { url: string }) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  const bookerUrl = useBookerUrl();
  const slug = teamSlugOrUsername;
  return (
    <div className="mb-4 flex items-center space-x-2">
      <Avatar
        alt={teamNameOrUserName}
        href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}
        imageSrc={`${orgBranding?.fullDomain ?? WEBAPP_URL}/${slug}/avatar.png` || undefined}
        size="md"
        className="mt-1 inline-flex justify-center"
      />
      <div>
        <Link
          href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}
          className="text-emphasis font-bold">
          {teamNameOrUserName}
        </Link>
        {membershipCount >= 0 && teamId && (
          <span className="text-subtle relative -top-px me-2 ms-2 text-xs">
            <Link href={`/settings/teams/${teamId}/members`}>
              <Badge variant="gray">
                <Users className="-mt-px mr-1 inline h-3 w-3" />
                {membershipCount}
              </Badge>
            </Link>
          </span>
        )}
        {slug && (
          <Link
            href={`${orgBranding ? orgBranding.fullDomain : CAL_URL}/${slug}`}
            className="text-subtle block text-xs">
            {`${bookerUrl.replace("https://", "").replace("http://", "")}/${slug}`}
          </Link>
        )}
      </div>
      {!slug && !!teamId && (
        <button onClick={() => publishTeamMutation.mutate({ teamId })}>
          <Badge variant="gray" className="-ml-2 mb-1">
            {t("upgrade")}
          </Badge>
        </button>
      )}
    </div>
  );
};

const CreateFirstEventTypeView = ({ slug }: { slug: string }) => {
  const { t } = useLocale();

  return (
    <EmptyScreen
      Icon={LinkIcon}
      headline={t("new_event_type_heading")}
      description={t("new_event_type_description")}
      className="mb-16"
      buttonRaw={
        <Button href={`?dialog=new&eventPage=${slug}`} variant="button">
          {t("create")}
        </Button>
      }
    />
  );
};

const CTA = () => {
  const { t } = useLocale();

  return (
    <>
      <CreateButtonWithTeamsList
        data-testid="new-event-type"
        subtitle={t("create_event_on").toUpperCase()}
        createDialog={() => <CreateEventTypeDialog profileOptions={[]} />}
      />
      <CreateEventTypeDialog profileOptions={[]} />
    </>
  );
};

const Actions = () => {
  return (
    <div className="hidden items-center md:flex">
      <TeamsFilter popoverTriggerClassNames="mb-0" showVerticalDivider={true} />
    </div>
  );
};

const SetupProfileBanner = ({ closeAction }: { closeAction: () => void }) => {
  const { t } = useLocale();
  const orgBranding = useOrgBranding();

  return (
    <Alert
      className="my-4"
      severity="info"
      title={t("set_up_your_profile")}
      message={t("set_up_your_profile_description", { orgName: orgBranding?.name })}
      CustomIcon={UserIcon}
      actions={
        <div className="flex gap-1">
          <Button color="minimal" className="text-sky-700 hover:bg-sky-100" onClick={closeAction}>
            {t("dismiss")}
          </Button>
          <Button
            color="secondary"
            className="border-sky-700 bg-sky-50 text-sky-700 hover:border-sky-900 hover:bg-sky-200"
            href="/getting-started">
            {t("set_up")}
          </Button>
        </div>
      }
    />
  );
};

const EmptyEventTypeList = ({
  teamSlugOrUsername,
  teamId,
}: {
  teamSlugOrUsername: string | null;
  teamId?: number | null;
}) => {
  const { t } = useLocale();
  if (!teamSlugOrUsername && !teamId) {
    return null;
  }
  return (
    <>
      <EmptyScreen
        headline={t("team_no_event_types")}
        buttonRaw={
          <Button
            href={`?dialog=new&eventPage=${teamSlugOrUsername}${teamId ? `&teamId=${teamId}` : ""}`}
            variant="button"
            className="mt-5">
            {t("create")}
          </Button>
        }
      />
    </>
  );
};

const Main = ({ filters }: { filters: ReturnType<typeof getTeamsFiltersFromQuery> }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchParams = useSearchParams();
  const orgBranding = useOrgBranding();

  // const isFilteredByOnlyOneItem =
  //   (filters?.teamIds?.length === 1 || filters?.userIds?.length === 1) && data?.eventTypeGroups.length === 1;
  const isFilteredByOnlyOneItem = false;

  // We first load user event types and then team event types
  const { data, status, error } = trpc.viewer.eventTypes.paginate.useQuery(
    {
      page: 1,
      pageSize: 10,
    },
    {
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  // Then we load teams
  const { data: teams } = trpc.viewer.teams.list.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  // After teams are fetched we then load event types for each team
  const eventTypePaginate = trpc.useQueries(
    (t) =>
      teams?.map((team) => t.viewer.eventTypes.paginate({ page: 1, pageSize: 10, teamIds: [team.id] }), {
        enabled: teams.length > 0,
      }) || []
  );

  if (status === "error") {
    return <Alert severity="error" title="Something went wrong" message={error.message} />;
  }
  if (status === "loading") {
    return <SkeletonLoader />;
  }

  if ((!!data && data.length > 1) || isFilteredByOnlyOneItem) {
    const [firstElementPersonalEventTypes] = data;
    const [mainUser] = firstElementPersonalEventTypes?.users || [];

    const teamEventTypesForTabs = eventTypePaginate
      .map((trpcFetch) => {
        const { data } = trpcFetch;
        return data || [];
      })
      .filter((item) => item && item.length > 0);
    return (
      <>
        {isMobile ? (
          <MobileTeamsTab teamEventTypes={[data, ...teamEventTypesForTabs]} />
        ) : (
          <div className="mt-4 flex flex-col">
            <EventTypeListHeading
              teamSlugOrUsername={mainUser.username || ""}
              teamNameOrUserName={mainUser.name || ""}
              // Single event types have no teamMembershipCount
              membershipCount={0}
              teamId={firstElementPersonalEventTypes.teamId}
              orgSlug={orgBranding?.slug}
            />

            {data.length > 0 ? (
              <EventTypeList data={data} />
            ) : (
              <EmptyEventTypeList teamSlugOrUsername={mainUser.username ?? ""} />
            )}

            {/* Then we list team event types */}
            {eventTypePaginate.map((trpcFetch, index) => {
              const { data: teamEventTypes } = trpcFetch;
              const [firstElementTeamEventTypes] = teamEventTypes || [];

              if (!teamEventTypes || teamEventTypes.length === 0 || !firstElementTeamEventTypes.team) {
                return null;
              }
              const teamDataMatchWithEventType = teams && teams.length > 0 ? teams[index] : null;
              const membershipCount = teamDataMatchWithEventType
                ? teamDataMatchWithEventType?.membershipCount
                : 0;

              return (
                <>
                  <EventTypeListHeading
                    key={index}
                    teamSlugOrUsername={firstElementTeamEventTypes.team.slug || ""}
                    teamNameOrUserName={firstElementTeamEventTypes.team.name || ""}
                    membershipCount={membershipCount}
                    teamId={firstElementTeamEventTypes.teamId}
                    orgSlug={orgBranding?.slug}
                  />

                  {teamEventTypes.length > 0 ? (
                    <EventTypeList
                      data={teamEventTypes}
                      key={index}
                      readonly={
                        teamDataMatchWithEventType ? "MEMBER" === teamDataMatchWithEventType.role : false
                      }
                    />
                  ) : (
                    <EmptyEventTypeList
                      teamId={firstElementTeamEventTypes.teamId}
                      teamSlugOrUsername={firstElementTeamEventTypes.team.slug || ""}
                      key={index}
                    />
                  )}
                </>
              );
            })}
          </div>
        )}
        <EventTypeEmbedDialog />
        {searchParams?.get("dialog") === "duplicate" && <DuplicateDialog />}
      </>
    );
  } else if (!!data && data.length === 1) {
    return <EventTypeList data={data} />;
  } else if (!!data && data.length === 0) {
    // @TODO:
    return <CreateFirstEventTypeView slug="fixlater" />;
  } else {
    return <></>;
  }
  //             ) : group.teamId ? (
  //               <EmptyEventTypeList group={group} />
  //             ) : (
  //               <CreateFirstEventTypeView slug={data.profiles[0].slug ?? ""} />
  //             )}
  //           </div>
  //         ))
  //       )}
  //     </>
  //   ) : (
  //     data.eventTypeGroups.length === 1 && (
  //       <EventTypeList
  //         types={data.eventTypeGroups[0].eventTypes}
  //         group={data.eventTypeGroups[0]}
  //         groupIndex={0}
  //         readOnly={data.eventTypeGroups[0].metadata.readOnly}
  //       />
  //     )
  //   )}
  //   {data.eventTypeGroups.length === 0 && <CreateFirstEventTypeView slug={data.profiles[0].slug ?? ""} />}
  //   <EventTypeEmbedDialog />
  //   {searchParams?.get("dialog") === "duplicate" && <DuplicateDialog />}
  // </>
  // );
};

const EventTypesPage = () => {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { open } = useIntercom();
  const { data: user } = useMeQuery();
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const orgBranding = useOrgBranding();
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);

  function closeBanner() {
    setShowProfileBanner(false);
    document.cookie = `calcom-profile-banner=1;max-age=${60 * 60 * 24 * 90}`; // 3 months
    showToast(t("we_wont_show_again"), "success");
  }

  useEffect(() => {
    if (searchParams?.get("openIntercom") === "true") {
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setShowProfileBanner(
      !!orgBranding && !document.cookie.includes("calcom-profile-banner=1") && !user?.completedOnboarding
    );
  }, [orgBranding, user]);

  return (
    <ShellMain
      withoutSeo
      heading={t("event_types_page_title")}
      hideHeadingOnMobile
      subtitle={t("event_types_page_subtitle")}
      afterHeading={showProfileBanner && <SetupProfileBanner closeAction={closeBanner} />}
      beforeCTAactions={<Actions />}
      CTA={<CTA />}>
      <HeadSeo
        title="Event Types"
        description="Create events to share for people to book on your calendar."
      />
      <Main filters={filters} />
    </ShellMain>
  );
};

EventTypesPage.getLayout = getLayout;

EventTypesPage.PageWrapper = PageWrapper;

export default EventTypesPage;
