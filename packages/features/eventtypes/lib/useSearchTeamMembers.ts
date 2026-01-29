import { useMemo } from "react";

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
};

type SearchTeamMembersResponse = {
  members: {
    userId: number;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    username: string | null;
    defaultScheduleId: number | null;
  }[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export function useSearchTeamMembers({
  teamId,
  search,
  enabled = true,
}: {
  teamId: number;
  search: string;
  enabled?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trpcAny = trpc as any;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpcAny.viewer.eventTypes.searchTeamMembers.useInfiniteQuery(
      { teamId, limit: 20, search: search || undefined },
      {
        enabled: enabled && teamId > 0,
        getNextPageParam: (lastPage: SearchTeamMembersResponse) => lastPage.nextCursor,
      }
    ) as {
      data: { pages: SearchTeamMembersResponse[] } | undefined;
      fetchNextPage: () => void;
      hasNextPage: boolean | undefined;
      isFetchingNextPage: boolean;
      isLoading: boolean;
    };

  const options = useMemo((): CheckedSelectOption[] => {
    return (
      data?.pages.flatMap((page: SearchTeamMembersResponse) =>
        page.members.map((m) => ({
          value: String(m.userId),
          label: m.name || m.email || "",
          avatar: m.avatarUrl || "",
          email: m.email,
          defaultScheduleId: m.defaultScheduleId,
          groupId: null,
        }))
      ) ?? []
    );
  }, [data]);

  return { options, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading };
}
