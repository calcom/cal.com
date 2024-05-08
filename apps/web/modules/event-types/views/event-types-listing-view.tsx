"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Trans } from "next-i18next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FC } from "react";
import { memo, useEffect, useState } from "react";
import { z } from "zod";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { EventTypeEmbedButton, EventTypeEmbedDialog } from "@calcom/features/embed/EventTypeEmbed";
import { EventTypeDescription } from "@calcom/features/eventtypes/components";
import CreateEventTypeDialog from "@calcom/features/eventtypes/components/CreateEventTypeDialog";
import { DuplicateDialog } from "@calcom/features/eventtypes/components/DuplicateDialog";
import { TeamsFilter } from "@calcom/features/filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import Shell from "@calcom/features/shell/Shell";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import type { User } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import type { UserProfile } from "@calcom/types/UserProfile";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  CreateButton,
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
  Icon,
  Label,
  showToast,
  Skeleton,
  Switch,
  Tooltip,
  ArrowButton,
  UserAvatarGroup,
} from "@calcom/ui";

import type { AppProps } from "@lib/app-providers";
import useMeQuery from "@lib/hooks/useMeQuery";

import SkeletonLoader from "@components/eventtype/SkeletonLoader";

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];

type EventTypeGroupProfile = EventTypeGroups[number]["profile"];
type GetByViewerResponse = RouterOutputs["viewer"]["eventTypes"]["getByViewer"] | undefined;

interface EventTypeListHeadingProps {
  profile: EventTypeGroupProfile;
  membershipCount: number;
  teamId?: number | null;
  bookerUrl: string;
}

type EventTypeGroup = EventTypeGroups[number];
type EventType = EventTypeGroup["eventTypes"][number];

type DeNormalizedEventType = Omit<EventType, "userIds"> & {
  users: (Pick<User, "id" | "name" | "username" | "avatarUrl"> & {
    nonProfileUsername: string | null;
    profile: UserProfile;
  })[];
};

type DeNormalizedEventTypeGroup = Omit<EventTypeGroup, "eventTypes"> & {
  eventTypes: DeNormalizedEventType[];
};

interface EventTypeListProps {
  group: DeNormalizedEventTypeGroup;
  groupIndex: number;
  readOnly: boolean;
  bookerUrl: string | null;
  types: DeNormalizedEventType[];
  lockedByOrg?: boolean;
}

interface MobileTeamsTabProps {
  eventTypeGroups: DeNormalizedEventTypeGroup[];
}

const querySchema = z.object({
  teamId: z.nullable(z.coerce.number()).optional().default(null),
});

const MobileTeamsTab: FC<MobileTeamsTabProps> = (props) => {
  const { eventTypeGroups } = props;
  const orgBranding = useOrgBranding();
  const tabs = eventTypeGroups.map((item) => ({
    name: item.profile.name ?? "",
    href: item.teamId ? `/event-types?teamId=${item.teamId}` : "/event-types?noTeam",
    avatar: orgBranding
      ? `${orgBranding.fullDomain}${item.teamId ? "/team" : ""}/${item.profile.slug}/avatar.png`
      : item.profile.image ?? `${WEBAPP_URL + (item.teamId && "/team")}/${item.profile.slug}/avatar.png`,
  }));
  const { data } = useTypedQuery(querySchema);
  const events = eventTypeGroups.filter((item) => item.teamId === data.teamId);

  return (
    <div>
      <HorizontalTabs tabs={tabs} />
      {events.length > 0 ? (
        <EventTypeList
          types={events[0].eventTypes}
          group={events[0]}
          groupIndex={0}
          bookerUrl={events[0].bookerUrl}
          readOnly={events[0].metadata.readOnly}
        />
      ) : (
        <CreateFirstEventTypeView slug={eventTypeGroups[0].profile.slug ?? ""} />
      )}
    </div>
  );
};

const Item = ({
  type,
  group,
  readOnly,
}: {
  type: DeNormalizedEventType;
  group: DeNormalizedEventTypeGroup;
  readOnly: boolean;
}) => {
  const { t } = useLocale();

  const content = () => (
    <div>
      <span
        className="text-default font-semibold ltr:mr-1 rtl:ml-1"
        data-testid={`event-type-title-${type.id}`}>
        {type.title}
      </span>
      {group.profile.slug ? (
        <small
          className="text-subtle hidden font-normal leading-4 sm:inline"
          data-testid={`event-type-slug-${type.id}`}>
          {`/${
            type.schedulingType !== SchedulingType.MANAGED ? group.profile.slug : t("username_placeholder")
          }/${type.slug}`}
        </small>
      ) : null}
      {readOnly && (
        <Badge variant="gray" className="ml-2">
          {t("readonly")}
        </Badge>
      )}
    </div>
  );

  return readOnly ? (
    <div className="flex-1 overflow-hidden pr-4 text-sm">
      {content()}
      <EventTypeDescription eventType={type} shortenDescription />
    </div>
  ) : (
    <Link
      href={`/event-types/${type.id}?tabName=setup`}
      className="flex-1 overflow-hidden pr-4 text-sm"
      title={type.title}>
      <div>
        <span
          className="text-default font-semibold ltr:mr-1 rtl:ml-1"
          data-testid={`event-type-title-${type.id}`}>
          {type.title}
        </span>
        {group.profile.slug ? (
          <small
            className="text-subtle hidden font-normal leading-4 sm:inline"
            data-testid={`event-type-slug-${type.id}`}>
            {`/${group.profile.slug}/${type.slug}`}
          </small>
        ) : null}
        {readOnly && (
          <Badge variant="gray" className="ml-2">
            {t("readonly")}
          </Badge>
        )}
      </div>
      <EventTypeDescription
        eventType={{ ...type, descriptionAsSafeHTML: type.safeDescription }}
        shortenDescription
      />
    </Link>
  );
};

const MemoizedItem = memo(Item);

export const EventTypeList = ({
  group,
  groupIndex,
  readOnly,
  types,
  bookerUrl,
  lockedByOrg,
}: EventTypeListProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogTypeId, setDeleteDialogTypeId] = useState(0);
  const [deleteDialogTypeSchedulingType, setDeleteDialogSchedulingType] = useState<SchedulingType | null>(
    null
  );
  const utils = trpc.useUtils();
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
        const newList = [...types.map(normalizeEventType)];
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
    const newList = [...types.map(normalizeEventType)];

    const type = types[index];
    const tmp = types[index + increment];
    if (tmp) {
      newList[index] = normalizeEventType(tmp);
      newList[index + increment] = normalizeEventType(type);
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
  const openDuplicateModal = (eventType: DeNormalizedEventType, group: DeNormalizedEventTypeGroup) => {
    const newSearchParams = new URLSearchParams(searchParams ?? undefined);
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
    setParamsIfDefined("pageSlug", group.profile.slug);
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
        const newList = types.filter((item) => item.id !== id).map(normalizeEventType);

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

  if (!types.length) {
    return group.teamId ? (
      <EmptyEventTypeList group={group} />
    ) : !group.profile.eventTypesLockedByOrg ? (
      <CreateFirstEventTypeView slug={group.profile.slug ?? ""} />
    ) : (
      <></>
    );
  }

  const firstItem = types[0];
  const lastItem = types[types.length - 1];
  const isManagedEventPrefix = () => {
    return deleteDialogTypeSchedulingType === SchedulingType.MANAGED ? "_managed" : "";
  };
  return (
    <div className="bg-default border-subtle mb-16 flex overflow-hidden rounded-md border">
      <ul ref={parent} className="divide-subtle !static w-full divide-y" data-testid="event-types">
        {types.map((type, index) => {
          const embedLink = `${group.profile.slug}/${type.slug}`;
          const calLink = `${bookerUrl}/${embedLink}`;
          const isPrivateURLEnabled = type.hashedLink?.link;
          const placeholderHashedLink = `${WEBSITE_URL}/d/${type.hashedLink?.link}/${type.slug}`;
          const isManagedEventType = type.schedulingType === SchedulingType.MANAGED;
          const isChildrenManagedEventType =
            type.metadata?.managedEventConfig !== undefined && type.schedulingType !== SchedulingType.MANAGED;
          return (
            <li key={type.id}>
              <div className="hover:bg-muted flex w-full items-center justify-between transition">
                <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
                  {!(firstItem && firstItem.id === type.id) && (
                    <ArrowButton onClick={() => moveEventType(index, -1)} arrowDirection="up" />
                  )}

                  {!(lastItem && lastItem.id === type.id) && (
                    <ArrowButton onClick={() => moveEventType(index, 1)} arrowDirection="down" />
                  )}
                  <MemoizedItem type={type} group={group} readOnly={readOnly} />
                  <div className="mt-4 hidden sm:mt-0 sm:flex">
                    <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                      {!!type.teamId && !isManagedEventType && (
                        <UserAvatarGroup
                          className="relative right-3"
                          size="sm"
                          truncateAfter={4}
                          users={type?.users ?? []}
                        />
                      )}
                      {isManagedEventType && type?.children && type.children?.length > 0 && (
                        <UserAvatarGroup
                          className="relative right-3"
                          size="sm"
                          truncateAfter={4}
                          users={type?.children.flatMap((ch) => ch.users) ?? []}
                        />
                      )}
                      <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                        {!isManagedEventType && (
                          <>
                            {type.hidden && <Badge variant="gray">{t("hidden")}</Badge>}
                            <Tooltip
                              content={type.hidden ? t("show_eventtype_on_profile") : t("hide_from_profile")}>
                              <div className="self-center rounded-md p-2">
                                <Switch
                                  name="Hidden"
                                  disabled={lockedByOrg}
                                  checked={!type.hidden}
                                  onCheckedChange={() => {
                                    setHiddenMutation.mutate({ id: type.id, hidden: !type.hidden });
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
                                  StartIcon="external-link"
                                />
                              </Tooltip>

                              <Tooltip content={t("copy_link")}>
                                <Button
                                  color="secondary"
                                  variant="icon"
                                  StartIcon="link"
                                  onClick={() => {
                                    showToast(t("link_copied"), "success");
                                    navigator.clipboard.writeText(calLink);
                                  }}
                                />
                              </Tooltip>

                              {isPrivateURLEnabled && (
                                <Tooltip content={t("copy_private_link_to_event")}>
                                  <Button
                                    color="secondary"
                                    variant="icon"
                                    StartIcon="venetian-mask"
                                    onClick={() => {
                                      showToast(t("private_link_copied"), "success");
                                      navigator.clipboard.writeText(placeholderHashedLink);
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </>
                          )}
                          <Dropdown modal={false}>
                            <DropdownMenuTrigger asChild data-testid={`event-type-options-${type.id}`}>
                              <Button
                                type="button"
                                variant="icon"
                                color="secondary"
                                StartIcon="ellipsis"
                                className="ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {!readOnly && (
                                <DropdownMenuItem>
                                  <DropdownItem
                                    type="button"
                                    data-testid={`event-type-edit-${type.id}`}
                                    StartIcon="pencil"
                                    onClick={() => router.push(`/event-types/${type.id}`)}>
                                    {t("edit")}
                                  </DropdownItem>
                                </DropdownMenuItem>
                              )}
                              {!isManagedEventType && !isChildrenManagedEventType && (
                                <>
                                  <DropdownMenuItem className="outline-none">
                                    <DropdownItem
                                      type="button"
                                      data-testid={`event-type-duplicate-${type.id}`}
                                      StartIcon="copy"
                                      onClick={() => openDuplicateModal(type, group)}>
                                      {t("duplicate")}
                                    </DropdownItem>
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isManagedEventType && (
                                <DropdownMenuItem className="outline-none">
                                  <EventTypeEmbedButton
                                    namespace=""
                                    as={DropdownItem}
                                    type="button"
                                    StartIcon="code"
                                    className="w-full rounded-none"
                                    embedUrl={encodeURIComponent(embedLink)}
                                    eventId={type.id}>
                                    {t("embed")}
                                  </EventTypeEmbedButton>
                                </DropdownMenuItem>
                              )}
                              {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                              {(group.metadata?.readOnly === false || group.metadata.readOnly === null) &&
                                !isChildrenManagedEventType && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <DropdownItem
                                        color="destructive"
                                        onClick={() => {
                                          setDeleteDialogOpen(true);
                                          setDeleteDialogTypeId(type.id);
                                          setDeleteDialogSchedulingType(type.schedulingType);
                                        }}
                                        StartIcon="trash"
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
                    <DropdownMenuTrigger asChild data-testid={`event-type-options-${type.id}`}>
                      <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
                    </DropdownMenuTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuContent>
                        {!isManagedEventType && (
                          <>
                            <DropdownMenuItem className="outline-none">
                              <DropdownItem
                                href={calLink}
                                target="_blank"
                                StartIcon="external-link"
                                className="w-full rounded-none">
                                {t("preview")}
                              </DropdownItem>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="outline-none">
                              <DropdownItem
                                data-testid={`event-type-duplicate-${type.id}`}
                                onClick={() => {
                                  navigator.clipboard.writeText(calLink);
                                  showToast(t("link_copied"), "success");
                                }}
                                StartIcon="clipboard"
                                className="w-full rounded-none text-left">
                                {t("copy_link")}
                              </DropdownItem>
                            </DropdownMenuItem>
                          </>
                        )}
                        {isNativeShare ? (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              data-testid={`event-type-duplicate-${type.id}`}
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
                              StartIcon="upload"
                              className="w-full rounded-none">
                              {t("share")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        ) : null}
                        {!readOnly && (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              onClick={() => router.push(`/event-types/${type.id}`)}
                              StartIcon="pencil"
                              className="w-full rounded-none">
                              {t("edit")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        )}
                        {!isManagedEventType && !isChildrenManagedEventType && (
                          <DropdownMenuItem className="outline-none">
                            <DropdownItem
                              onClick={() => openDuplicateModal(type, group)}
                              StartIcon="copy"
                              data-testid={`event-type-duplicate-${type.id}`}>
                              {t("duplicate")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        )}
                        {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                        {(group.metadata?.readOnly === false || group.metadata.readOnly === null) &&
                          !isChildrenManagedEventType && (
                            <>
                              <DropdownMenuItem className="outline-none">
                                <DropdownItem
                                  color="destructive"
                                  onClick={() => {
                                    setDeleteDialogOpen(true);
                                    setDeleteDialogTypeId(type.id);
                                    setDeleteDialogSchedulingType(type.schedulingType);
                                  }}
                                  StartIcon="trash"
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
                              {type.hidden ? t("show_eventtype_on_profile") : t("hide_from_profile")}
                            </Skeleton>
                            <Switch
                              id="hiddenSwitch"
                              name="Hidden"
                              checked={!type.hidden}
                              onCheckedChange={() => {
                                setHiddenMutation.mutate({ id: type.id, hidden: !type.hidden });
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
          isPending={deleteMutation.isPending}
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
  profile,
  membershipCount,
  teamId,
  bookerUrl,
}: EventTypeListHeadingProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();

  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <div className="mb-4 flex items-center space-x-2">
      <Avatar
        alt={profile.name || ""}
        href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}
        imageSrc={profile.image}
        size="md"
        className="mt-1 inline-flex justify-center"
      />
      <div>
        <Link
          href={teamId ? `/settings/teams/${teamId}/profile` : "/settings/my-account/profile"}
          className="text-emphasis font-bold">
          {profile.name || ""}
        </Link>
        {membershipCount && teamId && (
          <span className="text-subtle relative -top-px me-2 ms-2 text-xs">
            <Link href={`/settings/teams/${teamId}/members`}>
              <Badge variant="gray">
                <Icon name="users" className="-mt-px mr-1 inline h-3 w-3" />
                {membershipCount}
              </Badge>
            </Link>
          </span>
        )}
        {profile.slug && (
          <Link href={`${bookerUrl}/${profile.slug}`} className="text-subtle block text-xs">
            {`${bookerUrl.replace("https://", "").replace("http://", "")}/${profile.slug}`}
          </Link>
        )}
      </div>
      {!profile.slug && !!teamId && (
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
      Icon="link"
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

const CTA = ({
  profileOptions,
  isOrganization,
}: {
  profileOptions: {
    teamId: number | null | undefined;
    label: string | null;
    image: string;
    membershipRole: MembershipRole | null | undefined;
    slug: string | null;
  }[];
  isOrganization: boolean;
}) => {
  const { t } = useLocale();

  if (!profileOptions.length) return null;

  return (
    <CreateButton
      data-testid="new-event-type"
      subtitle={t("create_event_on").toUpperCase()}
      options={profileOptions}
      createDialog={() => (
        <CreateEventTypeDialog profileOptions={profileOptions} isOrganization={isOrganization} />
      )}
    />
  );
};

const Actions = (props: { showDivider: boolean }) => {
  return (
    <div className="hidden items-center md:flex">
      <TeamsFilter useProfileFilter popoverTriggerClassNames="mb-0" showVerticalDivider={props.showDivider} />
    </div>
  );
};

const EmptyEventTypeList = ({ group }: { group: DeNormalizedEventTypeGroup }) => {
  const { t } = useLocale();
  return (
    <>
      <EmptyScreen
        headline={t("team_no_event_types")}
        buttonRaw={
          <Button
            href={`?dialog=new&eventPage=${group.profile.slug}&teamId=${group.teamId}`}
            variant="button"
            className="mt-5">
            {t("create")}
          </Button>
        }
      />
    </>
  );
};

const Main = ({
  status,
  errorMessage,
  data: rawData,
  filters,
}: {
  status: string;
  data: GetByViewerResponse;
  errorMessage?: string;
  filters: ReturnType<typeof getTeamsFiltersFromQuery>;
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchParams = useCompatSearchParams();

  if (!rawData || status === "pending") {
    return <SkeletonLoader />;
  }

  if (status === "error") {
    return <Alert severity="error" title="Something went wrong" message={errorMessage} />;
  }

  const isFilteredByOnlyOneItem =
    (filters?.teamIds?.length === 1 || filters?.userIds?.length === 1) &&
    rawData.eventTypeGroups.length === 1;

  const data = denormalizePayload(rawData);
  return (
    <>
      {data.eventTypeGroups.length > 1 || isFilteredByOnlyOneItem ? (
        <>
          {isMobile ? (
            <MobileTeamsTab eventTypeGroups={data.eventTypeGroups} />
          ) : (
            data.eventTypeGroups.map((group, index: number) => {
              const eventsLockedByOrg = group.profile.eventTypesLockedByOrg;
              const userHasManagedOrHiddenEventTypes = group.eventTypes.find(
                (event) => event.metadata?.managedEventConfig || event.hidden
              );
              if (eventsLockedByOrg && !userHasManagedOrHiddenEventTypes) return null;
              return (
                <div
                  className="mt-4 flex flex-col"
                  data-testid={`slug-${group.profile.slug}`}
                  key={group.profile.slug}>
                  {/* If the group is readonly and empty don't leave a floating header when the user cant see the create box due
                    to it being readonly for that user */}
                  {group.eventTypes.length === 0 && group.metadata.readOnly ? null : (
                    <EventTypeListHeading
                      profile={group.profile}
                      membershipCount={group.metadata.membershipCount}
                      teamId={group.teamId}
                      bookerUrl={group.bookerUrl}
                    />
                  )}

                  {group.eventTypes.length ? (
                    <EventTypeList
                      types={group.eventTypes}
                      group={group}
                      bookerUrl={group.bookerUrl}
                      groupIndex={index}
                      readOnly={group.metadata.readOnly}
                      lockedByOrg={eventsLockedByOrg}
                    />
                  ) : group.teamId && !group.metadata.readOnly ? (
                    <EmptyEventTypeList group={group} />
                  ) : !group.metadata.readOnly ? (
                    <CreateFirstEventTypeView slug={data.profiles[0].slug ?? ""} />
                  ) : null}
                </div>
              );
            })
          )}
        </>
      ) : (
        data.eventTypeGroups.length === 1 && (
          <EventTypeList
            types={data.eventTypeGroups[0].eventTypes}
            group={data.eventTypeGroups[0]}
            groupIndex={0}
            bookerUrl={data.eventTypeGroups[0].bookerUrl}
            readOnly={data.eventTypeGroups[0].metadata.readOnly}
          />
        )
      )}
      {data.eventTypeGroups.length === 0 && <CreateFirstEventTypeView slug={data.profiles[0].slug ?? ""} />}
      <EventTypeEmbedDialog />
      {searchParams?.get("dialog") === "duplicate" && <DuplicateDialog />}
    </>
  );
};

const EventTypesPage: React.FC & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
  getLayout?: AppProps["Component"]["getLayout"];
} = () => {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const orgBranding = useOrgBranding();
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);

  // TODO: Maybe useSuspenseQuery to focus on success case only? Remember that it would crash the page when there is an error in query. Also, it won't support skeleton
  const { data, status, error } = trpc.viewer.eventTypes.getByViewer.useQuery(filters && { filters }, {
    refetchOnWindowFocus: false,
    gcTime: 1 * 60 * 60 * 1000,
    staleTime: 1 * 60 * 60 * 1000,
  });

  useEffect(() => {
    setShowProfileBanner(
      !!orgBranding && !document.cookie.includes("calcom-profile-banner=1") && !user?.completedOnboarding
    );
  }, [orgBranding, user]);

  const profileOptions = data
    ? data?.profiles
        .filter((profile) => !profile.readOnly)
        .filter((profile) => !profile.eventTypesLockedByOrg)
        .map((profile) => {
          return {
            teamId: profile.teamId,
            label: profile.name || profile.slug,
            image: profile.image,
            membershipRole: profile.membershipRole,
            slug: profile.slug,
          };
        })
    : [];

  return (
    <Shell
      withoutMain={false}
      title="Event Types"
      description="Create events to share for people to book on your calendar."
      withoutSeo
      heading={t("event_types_page_title")}
      hideHeadingOnMobile
      subtitle={t("event_types_page_subtitle")}
      beforeCTAactions={<Actions showDivider={profileOptions.length > 0} />}
      CTA={<CTA profileOptions={profileOptions} isOrganization={!!user?.organizationId} />}>
      <HeadSeo
        title="Event Types"
        description="Create events to share for people to book on your calendar."
      />
      <Main data={data} status={status} errorMessage={error?.message} filters={filters} />
    </Shell>
  );
};

export default EventTypesPage;

function normalizeEventType(eventType: DeNormalizedEventType): EventType {
  return {
    ...eventType,
    userIds: eventType.users.map((user) => user.id),
  };
}

function denormalizePayload(data: NonNullable<GetByViewerResponse>) {
  return {
    ...data,
    eventTypeGroups: data.eventTypeGroups.map((eventTypeGroup) => {
      return {
        ...eventTypeGroup,
        eventTypes: eventTypeGroup.eventTypes.map((eventType) => {
          const { userIds, ...rest } = eventType;
          return {
            ...rest,
            users: userIds.map((userId) => {
              const user = data.allUsersAcrossAllEventTypes.get(userId);
              if (!user) {
                throw new Error(`User with id ${userId} not found in allUsersAcrossAllEventTypes`);
              }
              return user;
            }),
          };
        }),
      };
    }),
  };
}
