import dayjs from "@calcom/dayjs";

export function getValidMonth(monthParam: string | null | undefined): string | null {
  if (!monthParam) return null;
  const parsed = dayjs(monthParam, "YYYY-MM", true);
  if (!parsed.isValid()) return null;

  const currentMonth = dayjs().startOf("month");
  if (parsed.isBefore(currentMonth)) {
    return currentMonth.format("YYYY-MM");
  }

  return parsed.format("YYYY-MM");
}

export function getValidDate(dateParam: string | null | undefined): string | null {
  if (!dateParam) return null;
  const parsed = dayjs(dateParam, "YYYY-MM-DD", true);
  if (!parsed.isValid()) return null;

  const today = dayjs().startOf("day");
  if (parsed.isBefore(today)) {
    return null;
  }

  return parsed.format("YYYY-MM-DD");
}
