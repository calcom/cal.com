import { useCallback, useEffect } from "react";
import type { DependencyList } from "react";

import type { RoundRobinChunkSettings } from "@calcom/features/bookings/Booker/store";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { RoundRobinChunkInfo } from "@calcom/lib/types/roundRobinChunkInfo";

type UseRoundRobinChunkingOptions = {
  roundRobinChunkInfo?: RoundRobinChunkInfo | null;
  isFetching: boolean;
  resetDeps?: DependencyList;
  roundRobinChunkSettings: RoundRobinChunkSettings | null;
  setRoundRobinChunkSettings: (settings: RoundRobinChunkSettings | null) => void;
};

export const useRoundRobinChunking = ({
  roundRobinChunkInfo,
  isFetching,
  resetDeps = [],
  roundRobinChunkSettings,
  setRoundRobinChunkSettings,
}: UseRoundRobinChunkingOptions) => {
  const setRoundRobinChunkInfo = useBookerStoreContext((state) => state.setRoundRobinChunkInfo);

  useEffect(() => {
    setRoundRobinChunkInfo(roundRobinChunkInfo ?? null);
  }, [roundRobinChunkInfo, setRoundRobinChunkInfo]);

  useEffect(() => {
    setRoundRobinChunkSettings(null);
    setRoundRobinChunkInfo(null);
  }, [setRoundRobinChunkInfo, setRoundRobinChunkSettings, ...resetDeps]);

  const handleLoadNextRoundRobinChunk = useCallback(() => {
    if (!roundRobinChunkInfo?.hasMoreNonFixedHosts || isFetching) return;
    const currentOffset = roundRobinChunkSettings?.chunkOffset ?? roundRobinChunkInfo.chunkOffset ?? 0;
    setRoundRobinChunkSettings({
      manual: true,
      chunkOffset: currentOffset + 1,
    });
  }, [roundRobinChunkInfo, roundRobinChunkSettings, isFetching, setRoundRobinChunkSettings]);

  return {
    roundRobinChunkSettings,
    roundRobinChunkInfo: roundRobinChunkInfo ?? null,
    isManualRoundRobinChunking: roundRobinChunkSettings?.manual ?? false,
    handleLoadNextRoundRobinChunk,
  };
};
