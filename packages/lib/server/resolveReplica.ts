const REPLICA_HEADER = "x-cal-replica";

export function resolveReplica(headers: Headers): string | null {
  return headers.get(REPLICA_HEADER);
}
