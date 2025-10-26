"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FC } from "react";
import { memo, useEffect, useState } from "react";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { CreateButton } from "@calcom/features/ee/teams/components/createButton/CreateButton";
import { EventTypeEmbedButton, EventTypeEmbedDialog } from "@calcom/features/embed/EventTypeEmbed";
import { EventTypeDescription } from "@calcom/features/eventtypes/components";
import {
  CreateEventTypeDialog,
  type ProfileOption,
} from "@calcom/features/eventtypes/components/CreateEventTypeDialog";
import { DuplicateDialog } from "@calcom/features/eventtypes/components/DuplicateDialog";
import { InfiniteSkeletonLoader } from "@calcom/features/eventtypes/components/SkeletonLoader";
import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { filterActiveLinks } from "@calcom/lib/hashedLinksUtils";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { localStorage } from "@calcom/lib/webstorage";
import { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { ArrowButton } from "@calcom/ui/components/arrow-button";
import { UserAvatarGroup } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { Skeleton } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { TRPCClientError } from "@trpc/client";

type GetUserEventGroupsResponse = RouterOutputs["viewer"]["eventTypes"]["getUserEventGroups"];
type GetEventTypesFromGroupsResponse = RouterOutputs["viewer"]["eventTypes"]["getEventTypesFromGroup"];

type InfiniteEventTypeGroup = GetUserEventGroupsResponse["eventTypeGroups"][number];
type InfiniteEventType = GetEventTypesFromGroupsResponse["eventTypes"][number];

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];

type EventTypeGroup = EventTypeGroups[number];
type EventType = EventTypeGroup["eventTypes"][number];

const LIMIT = 10;

interface InfiniteEventTypeListProps {
  group: InfiniteEventTypeGroup;
  readOnly: boolean;
  bookerUrl: string | null;
  pages: { nextCursor: number | null | undefined; eventTypes: InfiniteEventType[] }[] | undefined;
  lockedByOrg?: boolean;
  isPending?: boolean;
  debouncedSearchTerm?: string;
}

interface InfiniteTeamsTabProps {
  activeEventTypeGroup: InfiniteEventTypeGroup;
}

const querySchema = z.object({
  teamId: z.nullable(z.coerce.number()).optional().default(null),
});

const InfiniteTeamsTab: FC<InfiniteTeamsTabProps> = (props) => {
  const { activeEventTypeGroup } = props;
  const { t } = useLocale();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const query = trpc.viewer.eventTypes.getEventTypesFromGroup.useInfiniteQuery(
    {
      limit: LIMIT,
      searchQuery: debouncedSearchTerm,
      group: { teamId: activeEventTypeGroup?.teamId, parentId: activeEventTypeGroup?.parentId },
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const buttonInView = useInViewObserver(() => {
    if (!query.isFetching && query.hasNextPage && query.status === "success") {
      query.fetchNextPage();
    }
  }, null);

  return (
    <div>
      <TextField
        className="max-w-64"
        addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
        containerClassName="max-w-64 focus:!ring-offset-0 mb-4"
        type="search"
        value={searchTerm}
        autoComplete="false"
        onChange={(e) => {
          setSearchTerm(e.target.value);
        }}
        placeholder={t("search")}
      />
      {!!activeEventTypeGroup && (
        <InfiniteEventTypeList
          pages={query?.data?.pages}
          group={activeEventTypeGroup}
          bookerUrl={activeEventTypeGroup.bookerUrl}
          readOnly={activeEventTypeGroup.metadata.readOnly}
          isPending={query.isPending}
          debouncedSearchTerm={debouncedSearchTerm}
        />
      )}
      {(query.data?.pages?.[0]?.eventTypes?.length ?? 0) > 0 && (
        <div className="text-default p-4 text-center" ref={buttonInView.ref}>
          <Button
            color="minimal"
            loading={query.isFetchingNextPage}
            disabled={!query.hasNextPage}
            onClick={() => query.fetchNextPage()}>
            {query.hasNextPage ? t("load_more_results") : t("no_more_results")}
          </Button>
        </div>
      )}
    </div>
  );
};

const Item = ({
  type,
  group,
  readOnly,
}: {
  type: EventType | InfiniteEventType;
  group: EventTypeGroup | InfiniteEventTypeGroup;
  readOnly: boolean;
}) => {
  const { t } = useLocale();
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";
  const parsedeventTypeColor = parseEventTypeColor(type.eventTypeColor);
  const eventTypeColor =
    parsedeventTypeColor && parsedeventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];

  const content = () => (
    <div>
      <span
        className="text-default font-semibold ltr:mr-1 rtl:ml-1"
        data-testid={`event-type-title-${type.id}`}>
        {type.title}
      </span>
      {group.profile.slug && type.schedulingType !== SchedulingType.MANAGED ? (
        <small
          className="text-subtle hidden font-normal leading-4 sm:inline"
          data-testid={`event-type-slug-${type.id}`}>
          {`/${group.profile.slug}/${type.slug}`}
        </small>
      ) : null}
      {readOnly && (
        <Badge variant="gray" className="ml-2" data-testid="readonly-badge">
          {t("readonly")}
        </Badge>
      )}
    </div>
  );

  return (
    <div className={classNames(eventTypeColor && "-ml-3", "relative flex-1 overflow-hidden pr-4 text-sm")}>
      {eventTypeColor && (
        <div className="absolute h-full w-0.5" style={{ backgroundColor: eventTypeColor }} />
      )}
      <div className={classNames(eventTypeColor && "ml-3")}>
        {readOnly ? (
          <div>
            {content()}
            <EventTypeDescription eventType={type} shortenDescription />
          </div>
        ) : (
          <Link href={`/event-types/${type.id}?tabName=setup`} title={type.title}>
            <div>
              <span
                className="text-default font-semibold ltr:mr-1 rtl:ml-1"
                data-testid={`event-type-title-${type.id}`}>
                {type.title}
              </span>
              {group.profile.slug && type.schedulingType !== SchedulingType.MANAGED ? (
                <small
                  className="text-subtle hidden font-normal leading-4 sm:inline"
                  data-testid={`event-type-slug-${type.id}`}>
                  {`/${group.profile.slug}/${type.slug}`}
                </small>
              ) : null}
              {readOnly && (
                <Badge variant="gray" className="ml-2" data-testid="readonly-badge">
                  {t("readonly")}
                </Badge>
              )}
            </div>
            <EventTypeDescription
              eventType={{ ...type, descriptionAsSafeHTML: type.safeDescription }}
              shortenDescription
            />
          </Link>
        )}
      </div>
    </div>
  );
};

const MemoizedItem = memo(Item);

export const InfiniteEventTypeList = ({
  group,
  readOnly,
  pages,
  bookerUrl,
  lockedByOrg,
  isPending,
  debouncedSearchTerm,
}: InfiniteEventTypeListProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { copyToClipboard } = useCopy();
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogTypeId, setDeleteDialogTypeId] = useState(0);
  const [deleteDialogTypeSchedulingType, setDeleteDialogSchedulingType] = useState<SchedulingType | null>(
    null
  );
  const [privateLinkCopyIndices, setPrivateLinkCopyIndices] = useState<Record<string, number>>({});

  const utils = trpc.useUtils();
  const mutation = trpc.viewer.loggedInViewerRouter.eventTypeOrder.useMutation({
    onError: async (err) => {
      console.error(err.message);
      // REVIEW: Should we invalidate the entire router or just the `getByViewer` query?
      await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
    },
  });

  const setHiddenMutation = trpc.viewer.eventTypesHeavy.update.useMutation({
    onMutate: async (data) => {
      await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData({
        limit: LIMIT,
        searchQuery: debouncedSearchTerm,
        group: { teamId: group?.teamId, parentId: group?.parentId },
      });

      if (previousValue) {
        pages?.forEach((page) => {
          page?.eventTypes?.forEach((eventType) => {
            if (eventType.id === data.id) {
              eventType.hidden = !eventType.hidden;
            }
          });
        });
      }

      return { previousValue };
    },
    onError: async (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(
          {
            limit: LIMIT,
            searchQuery: debouncedSearchTerm,
            group: { teamId: group?.teamId, parentId: group?.parentId },
          },
          context.previousValue
        );
      }
      console.error(err.message);
    },
  });

  async function moveEventType(index: number, increment: 1 | -1) {
    if (!pages) return;
    const newOrder = pages;
    const pageNo = Math.floor(index / LIMIT);

    const currentPositionEventType = newOrder[pageNo].eventTypes[index % LIMIT];

    const newPageNo =
      increment === -1
        ? pageNo > 0 && index % LIMIT === 0
          ? pageNo - 1
          : pageNo
        : index % LIMIT === LIMIT - 1
        ? pageNo + 1
        : pageNo;

    const newIdx = (index + increment) % LIMIT;
    const newPositionEventType = newOrder[newPageNo].eventTypes[newIdx];

    newOrder[pageNo].eventTypes[index % LIMIT] = newPositionEventType;
    newOrder[newPageNo].eventTypes[newIdx] = currentPositionEventType;

    await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
    const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData({
      limit: LIMIT,
      searchQuery: debouncedSearchTerm,
      group: { teamId: group?.teamId, parentId: group?.parentId },
    });

    if (previousValue) {
      utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(
        {
          limit: LIMIT,
          searchQuery: debouncedSearchTerm,
          group: { teamId: group?.teamId, parentId: group?.parentId },
        },
        (data) => {
          if (!data) return { pages: [], pageParams: [] };

          return {
            ...data,
            pages: newOrder.map((page) => ({
              ...page,
              nextCursor: page.nextCursor ?? undefined,
            })),
          };
        }
      );
    }

    mutation.mutate({
      ids: newOrder.flatMap((page) => page.eventTypes.map((type) => type.id)),
    });
  }

  async function deleteEventTypeHandler(id: number) {
    const payload = { id };
    deleteMutation.mutate(payload);
  }

  // inject selection data into url for correct router history
  const openDuplicateModal = (eventType: InfiniteEventType, group: InfiniteEventTypeGroup) => {
    const newSearchParams = new URLSearchParams(searchParams?.toString() ?? undefined);
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
      await utils.viewer.eventTypes.getEventTypesFromGroup.cancel();
      const previousValue = utils.viewer.eventTypes.getEventTypesFromGroup.getInfiniteData({
        limit: LIMIT,
        searchQuery: debouncedSearchTerm,
        group: { teamId: group?.teamId, parentId: group?.parentId },
      });

      if (previousValue) {
        await utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(
          {
            limit: LIMIT,
            searchQuery: debouncedSearchTerm,
            group: { teamId: group?.teamId, parentId: group?.parentId },
          },
          (data) => {
            if (!data) {
              return {
                pages: [],
                pageParams: [],
              };
            }
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                eventTypes: page.eventTypes.filter((type) => type.id !== id),
              })),
            };
          }
        );
      }

      return { previousValue };
    },
    onError: (err, _, context) => {
      if (context?.previousValue) {
        utils.viewer.eventTypes.getEventTypesFromGroup.setInfiniteData(
          {
            limit: LIMIT,
            searchQuery: debouncedSearchTerm,
            group: { teamId: group?.teamId, parentId: group?.parentId },
          },
          context.previousValue
        );
      }
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setDeleteDialogOpen(false);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });

  const [isNativeShare, setNativeShare] = useState(true);

  useEffect(() => {
    if (!navigator.share) {
      setNativeShare(false);
    }
  }, []);

  if (!pages?.[0]?.eventTypes?.length) {
    if (isPending) return <InfiniteSkeletonLoader />;

    return group.teamId ? (
      <EmptyEventTypeList group={group} searchTerm={debouncedSearchTerm} />
    ) : !group.profile.eventTypesLockedByOrg ? (
      <CreateFirstEventTypeView slug={group.profile.slug ?? ""} searchTerm={debouncedSearchTerm} />
    ) : (
      <></>
    );
  }

  const firstItem = pages?.[0]?.eventTypes[0];
  const lastItem = pages?.[pages.length - 1]?.eventTypes[pages?.[pages.length - 1].eventTypes.length - 1];
  const isManagedEventPrefix = () => {
    return deleteDialogTypeSchedulingType === SchedulingType.MANAGED ? "_managed" : "";
  };

  const userTimezone = extractHostTimezone({
    userId: firstItem.userId,
    teamId: firstItem?.teamId,
    hosts: firstItem?.hosts,
    owner: firstItem?.owner,
    team: firstItem?.team,
  });

  return (
    <div className="bg-default border-subtle flex flex-col overflow-hidden rounded-md border">
      <ul ref={parent} className="divide-subtle !static w-full divide-y" data-testid="event-types">
        {pages.map((page, pageIdx) => {
          return page?.eventTypes?.map((type, index) => {
            const embedLink = `${group.profile.slug}/${type.slug}`;
            const calLink = `${bookerUrl}/${embedLink}`;

            const activeHashedLinks = type.hashedLink ? filterActiveLinks(type.hashedLink, userTimezone) : [];

            // Ensure index is within bounds for active links
            const currentIndex = privateLinkCopyIndices[type.slug] ?? 0;
            const safeIndex = activeHashedLinks.length > 0 ? currentIndex % activeHashedLinks.length : 0;

            const isPrivateURLEnabled =
              activeHashedLinks.length > 0 ? activeHashedLinks[safeIndex]?.link : "";
            const placeholderHashedLink = `${bookerUrl}/d/${isPrivateURLEnabled}/${type.slug}`;

            const isManagedEventType = type.schedulingType === SchedulingType.MANAGED;
            const isChildrenManagedEventType =
              type.metadata?.managedEventConfig !== undefined &&
              type.schedulingType !== SchedulingType.MANAGED;
            return (
              <li key={type.id}>
                <div className="hover:bg-muted flex w-full items-center justify-between transition">
                  <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
                    {!(firstItem && firstItem.id === type.id) && (
                      <ArrowButton
                        onClick={() => moveEventType(LIMIT * pageIdx + index, -1)}
                        arrowDirection="up"
                      />
                    )}

                    {!(lastItem && lastItem.id === type.id) && (
                      <ArrowButton
                        onClick={() => moveEventType(LIMIT * pageIdx + index, 1)}
                        arrowDirection="down"
                      />
                    )}
                    <MemoizedItem type={type} group={group} readOnly={readOnly} />
                    <div className="mt-4 hidden sm:mt-0 sm:flex">
                      <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                        {!!type.teamId && !isManagedEventType && (
                          <UserAvatarGroup
                            className="relative right-3"
                            size="sm"
                            truncateAfter={4}
                            hideTruncatedAvatarsCount={true}
                            users={type?.users ?? []}
                          />
                        )}
                        {isManagedEventType && type?.children && type.children?.length > 0 && (
                          <UserAvatarGroup
                            className="relative right-3"
                            size="sm"
                            truncateAfter={4}
                            hideTruncatedAvatarsCount={true}
                            users={type?.children.flatMap((ch) => ch.users) ?? []}
                          />
                        )}
                        <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse">
                          {!isManagedEventType && (
                            <>
                              {type.hidden && <Badge variant="gray">{t("hidden")}</Badge>}
                              <Tooltip
                                content={
                                  type.hidden ? t("show_eventtype_on_profile") : t("hide_from_profile")
                                }>
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
                                      copyToClipboard(calLink);
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
                                        copyToClipboard(placeholderHashedLink);
                                        setPrivateLinkCopyIndices((prev) => {
                                          const prevIndex = prev[type.slug] ?? 0;
                                          const nextIndex = (prevIndex + 1) % activeHashedLinks.length;
                                          return { ...prev, [type.slug]: nextIndex };
                                        });
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
                                  // Unusual practice to use radix state open but for some reason this dropdown and only this dropdown clears the border radius of this button.
                                  className="ltr:radix-state-open:rounded-r-[--btn-group-radius] rtl:radix-state-open:rounded-l-[--btn-group-radius]"
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
                                {/* readonly is only set when we are on a team - if we are on a user event type null will be the value. */}
                                {!readOnly && !isManagedEventType && !isChildrenManagedEventType && (
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
                                      namespace={type.slug}
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
                                {!readOnly && !isChildrenManagedEventType && (
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
                                        className="w-full rounded-t-none">
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
                          {!readOnly && !isManagedEventType && !isChildrenManagedEventType && (
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
                          {!readOnly && !isChildrenManagedEventType && (
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
                                  className="w-full rounded-t-none">
                                  {t("delete")}
                                </DropdownItem>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          {!isManagedEventType && (
                            <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between rounded-b-lg px-4 py-2 transition">
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
          });
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
            {deleteDialogTypeSchedulingType === SchedulingType.MANAGED ? (
              <ul className="ml-4 list-disc">
                <li>{t("delete_managed_event_type_description_1")}</li>
                <li>{t("delete_managed_event_type_description_2")}</li>
              </ul>
            ) : (
              t("delete_event_type_description")
            )}
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

const CreateFirstEventTypeView = ({ slug, searchTerm }: { slug: string; searchTerm?: string }) => {
  const { t } = useLocale();

  return (
    <EmptyScreen
      Icon="link"
      headline={searchTerm ? t("no_result_found_for", { searchTerm }) : t("new_event_type_heading")}
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

const CTA = ({ profileOptions }: { profileOptions: ProfileOption[] }) => {
  const { t } = useLocale();

  if (!profileOptions.length) return null;

  return (
    <CreateButton
      data-testid="new-event-type"
      subtitle={t("create_event_on").toUpperCase()}
      options={profileOptions}
      createDialog={() => <CreateEventTypeDialog profileOptions={profileOptions} />}
    />
  );
};

const EmptyEventTypeList = ({
  group,
  searchTerm,
}: {
  group: EventTypeGroup | InfiniteEventTypeGroup;
  searchTerm?: string;
}) => {
  const { t } = useLocale();
  return (
    <>
      <EmptyScreen
        headline={searchTerm ? t("no_result_found_for", { searchTerm }) : t("team_no_event_types")}
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

const InfiniteScrollMain = ({
  eventTypeGroups,
  profiles,
}: {
  eventTypeGroups: GetUserEventGroupsResponse["eventTypeGroups"];
  profiles: GetUserEventGroupsResponse["profiles"];
}) => {
  const searchParams = useSearchParams();
  const { data } = useTypedQuery(querySchema);
  const orgBranding = useOrgBranding();

  const tabs = eventTypeGroups.map((item) => ({
    name: item.profile.name ?? "",
    href: item.teamId ? `/event-types?teamId=${item.teamId}` : "/event-types",
    avatar: item.profile.image,
    "data-testid": item.profile.name ?? "",
    matchFullPath: true,
  }));

  const activeEventTypeGroup =
    eventTypeGroups.filter((item) => item.teamId === data.teamId) ?? eventTypeGroups[0];

  const bookerUrl = orgBranding ? orgBranding?.fullDomain : WEBSITE_URL;

  // If the event type group is the same as the org branding team, or the parent team, set the bookerUrl to the org branding URL
  // This is to ensure that the bookerUrl is always the same as the one in the org branding settings
  // This keeps the app working for personal event types that were not migrated to the org (rare)
  if (
    orgBranding &&
    (activeEventTypeGroup[0].teamId === orgBranding.id || activeEventTypeGroup[0].parentId === orgBranding.id)
  ) {
    activeEventTypeGroup[0].bookerUrl = bookerUrl;
  }

  return (
    <>
      {eventTypeGroups.length > 1 && <HorizontalTabs tabs={tabs} />}
      {eventTypeGroups.length >= 1 && <InfiniteTeamsTab activeEventTypeGroup={activeEventTypeGroup[0]} />}
      {eventTypeGroups.length === 0 && <CreateFirstEventTypeView slug={profiles[0].slug ?? ""} />}
      <EventTypeEmbedDialog />
      {searchParams?.get("dialog") === "duplicate" && <DuplicateDialog />}
    </>
  );
};

type Props = {
  userEventGroupsData: GetUserEventGroupsResponse;
  user: {
    id: number;
    completedOnboarding?: boolean;
  } | null;
};

export const EventTypesCTA = ({ userEventGroupsData }: Omit<Props, "user">) => {
  const profileOptions =
    userEventGroupsData.profiles
      ?.filter((profile) => !profile.readOnly)
      ?.filter((profile) => !profile.eventTypesLockedByOrg)
      ?.filter((profile) => {
        // For personal profiles (teamId is null), always allow creation
        if (!profile.teamId) {
          return true;
        }

        // For team profiles, check if user has eventType.create permission
        // This will be populated by the server-side PBAC check
        // Fallback to role-based check (admin/owner) if canCreateEventTypes is not set
        if (profile.canCreateEventTypes !== undefined) {
          return profile.canCreateEventTypes;
        }

        // Fallback: allow admin and owner roles
        return (
          profile.membershipRole === MembershipRole.ADMIN || profile.membershipRole === MembershipRole.OWNER
        );
      })
      ?.map((profile) => {
        const permissions = profile.teamId
          ? userEventGroupsData.teamPermissions[profile.teamId]
          : {
              // always can create eventType on personal level
              canCreateEventType: true,
            };

        return {
          teamId: profile.teamId,
          label: profile.name || profile.slug,
          image: profile.image,
          membershipRole: profile.membershipRole,
          slug: profile.slug,
          permissions,
        };
      }) ?? [];

  return <CTA profileOptions={profileOptions} />;
};

const EventTypesPage = ({ userEventGroupsData, user }: Props) => {
  const [_showProfileBanner, setShowProfileBanner] = useState(false);
  const orgBranding = useOrgBranding();
  const router = useRouter();

  useEffect(() => {
    /**
     * During signup, if the account already exists, we redirect the user to /event-types instead of onboarding.
     * Adding this redirection logic here as well to ensure the user is redirected to the correct redirectUrl.
     */
    const redirectUrl = localStorage.getItem("onBoardingRedirect");
    localStorage.removeItem("onBoardingRedirect");
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, []);

  useEffect(() => {
    setShowProfileBanner(
      !!orgBranding && !document.cookie.includes("calcom-profile-banner=1") && !user?.completedOnboarding
    );
  }, [orgBranding, user]);

  return (
    <InfiniteScrollMain
      profiles={userEventGroupsData.profiles}
      eventTypeGroups={userEventGroupsData.eventTypeGroups}
    />
  );
};

export default EventTypesPage;
