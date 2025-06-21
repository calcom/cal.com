export const isHostMatchingDomain = (host: string, domain: string): boolean => {
  const normalizedHost = host.toLowerCase().split(":")[0];
  const normalizedDomain = domain.toLowerCase();
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
};
