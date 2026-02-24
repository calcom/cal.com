import { useMemo } from "react";

import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  weight?: number;
  isFixed?: boolean;
  disabled?: boolean;
  defaultScheduleId?: number | null;
  groupId: string | null;
  role?: MembershipRole;
};

export type SearchTeamMember = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  defaultScheduleId: number | null;
  role: MembershipRole;
};

export function useSearchTeamMembers({
  teamId,
  search,
  enabled = true,
  memberUserIds,
}: {
  teamId: number;
  search: string;
  enabled?: boolean;
  memberUserIds?: number[];
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.viewer.eventTypes.searchTeamMembers.useInfiniteQuery(
      {
        teamId,
        limit: 20,
        search: search || undefined,
        memberUserIds: memberUserIds?.length ? memberUserIds : undefined,
      },
      {
        enabled: enabled && teamId > 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const options = useMemo((): CheckedSelectOption[] => {
    return (
      data?.pages.flatMap((page) =>
        page.members.map((m) => ({
          value: String(m.userId),
          label: m.name || m.email || "",
          avatar: m.avatarUrl || "",
          email: m.email,
          defaultScheduleId: m.defaultScheduleId,
          groupId: null,
          role: m.role,
        }))
      ) ?? []
    );
  }, [data]);

  const members = useMemo((): SearchTeamMember[] => {
    return data?.pages.flatMap((page) => page.members) ?? [];
  }, [data]);

  return { options, members, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading };
}
