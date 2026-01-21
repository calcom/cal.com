export type RoundRobinChunkInfo = {
  totalHosts: number;
  totalNonFixedHosts: number;
  chunkSize: number;
  chunkOffset: number;
  loadedNonFixedHosts: number;
  hasMoreNonFixedHosts: boolean;
  manualChunking: boolean;
};
