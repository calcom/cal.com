type FilterHostsService = {
  filterHostsBySameRoundRobinHost: (..._args: unknown[]) => unknown;
};

// Host filtering with delegation credentials removed (EE feature)
const noOpService: FilterHostsService = {
  filterHostsBySameRoundRobinHost: () => null,
};

export function getFilterHostsService(): FilterHostsService {
  return noOpService;
}
