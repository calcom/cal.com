export const getIssueFieldName = (message?: string) => {
  if (!message) {
    return null;
  }

  const match = message.match(/^\{([^}]+)\}/);
  return match?.[1] ?? null;
};

export const isFieldVisibleInBookingView = (views?: { id: string }[]) => {
  if (!views || views.length === 0) {
    return true;
  }

  return views.some((view) => view.id === "booking");
};

export const normalizeBookingResponses = (responses: Record<string, unknown>) => {
  return Object.entries(responses).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value.trim();
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.map((item) => (typeof item === "string" ? item.trim() : item));
      return acc;
    }

    if (value && typeof value === "object") {
      const normalizedObject = Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((objectAcc, [objectKey, objectValue]) => {
        objectAcc[objectKey] = typeof objectValue === "string" ? objectValue.trim() : objectValue;
        return objectAcc;
      }, {});

      acc[key] = normalizedObject;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};
