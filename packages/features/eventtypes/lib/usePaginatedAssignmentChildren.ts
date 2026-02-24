import { keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import type { PendingChildrenChanges } from "./types";

const DEFAULT_PENDING_CHANGES: PendingChildrenChanges = {
  childrenToAdd: [],
  childrenToUpdate: [],
  childrenToRemove: [],
};

export type AssignmentChild = {
  childEventTypeId: number;
  slug: string;
  hidden: boolean;
  created: boolean;
  owner: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

export function usePaginatedAssignmentChildren({
  eventTypeId,
  pendingChanges,
  search,
  enabled = true,
}: {
  eventTypeId: number;
  pendingChanges: PendingChildrenChanges;
  search: string;
  enabled?: boolean;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading } =
    trpc.viewer.eventTypes.getChildrenForAssignment.useInfiniteQuery(
      { eventTypeId, limit: 20, search: search || undefined },
      {
        enabled: enabled && eventTypeId > 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  const serverChildren = useMemo((): AssignmentChild[] => {
    return (
      data?.pages.flatMap((page) =>
        page.children.map((c) => ({
          childEventTypeId: c.childEventTypeId,
          slug: c.slug,
          hidden: c.hidden,
          created: true,
          owner: c.owner,
        }))
      ) ?? []
    );
  }, [data]);

  const children = useMemo((): AssignmentChild[] => {
    const changes = pendingChanges ?? DEFAULT_PENDING_CHANGES;

    // When clearAllChildren is true, ignore server children and only show childrenToAdd
    if (changes.clearAllChildren) {
      return changes.childrenToAdd.map((c) => ({
        childEventTypeId: 0,
        slug: c.slug,
        hidden: c.hidden,
        created: false,
        owner: {
          id: c.owner.id,
          name: c.owner.name,
          email: c.owner.email,
          username: c.owner.username,
          avatarUrl: c.owner.avatar,
        },
      }));
    }

    const removeSet = new Set(changes.childrenToRemove);
    const updateMap = new Map(changes.childrenToUpdate.map((u) => [u.userId, u]));

    // Filter out removed children and apply updates
    let result: AssignmentChild[] = serverChildren
      .filter((c) => !removeSet.has(c.owner.id))
      .map((c) => {
        const update = updateMap.get(c.owner.id);
        return update ? { ...c, hidden: update.hidden ?? c.hidden } : c;
      });

    // Prepend newly added children
    if (changes.childrenToAdd.length > 0) {
      const added: AssignmentChild[] = changes.childrenToAdd.map((c) => ({
        childEventTypeId: 0,
        slug: c.slug,
        hidden: c.hidden,
        created: false,
        owner: {
          id: c.owner.id,
          name: c.owner.name,
          email: c.owner.email,
          username: c.owner.username,
          avatarUrl: c.owner.avatar,
        },
      }));
      result = [...added, ...result];
    }

    return result;
  }, [serverChildren, pendingChanges]);

  return { children, serverChildren, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading };
}

/** Convert an AssignmentChild to a ChildrenEventType for form compatibility */
export function assignmentChildToChildrenEventType(
  child: AssignmentChild,
  pendingString: string
): ChildrenEventType {
  return {
    value: String(child.owner.id),
    label: `${child.owner.name || child.owner.email || ""}${!child.owner.username ? ` (${pendingString})` : ""}`,
    slug: child.slug,
    hidden: child.hidden,
    created: child.created,
    owner: {
      id: child.owner.id,
      name: child.owner.name ?? "",
      email: child.owner.email,
      username: child.owner.username ?? "",
      avatar: child.owner.avatarUrl ?? "",
      membership: MembershipRole.MEMBER,
      eventTypeSlugs: [],
      profile: null,
    },
  };
}
