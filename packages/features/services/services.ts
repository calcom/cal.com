const registeredServices = new Map<string, string>([
  // Valid Email addresses that don't correspond to real emails
  // Could be used as alterative for where we need the email ID of the person who took the action
  ["google-calendar-app@cal.internal", "Google Calendar App"],
  ["outlook-app@cal.internal", "Outlook App"],
]);

export const getServiceName = (serviceId: string) => {
  return registeredServices.get(serviceId);
};

export const getAvailableServiceIds = () => {
  return Array.from(registeredServices.keys());
};

export const doesServiceIdExist = (serviceId: string) => {
  return registeredServices.has(serviceId);
};
