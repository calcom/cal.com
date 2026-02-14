/**
 * Ensures that contains has no non-existent sub-options
 */
export function getOptionsWithValidContains<
  T extends { id?: string; value: string; contains?: string[]; isGroup?: boolean }
>(options: T[]): T[] {
  return options
    .filter((obj, index, self) => index === self.findIndex((t) => t.value === obj.value))
    .map(({ contains, ...option }) => {
      if (!contains)
        return {
          ...option,
          contains: [] as string[],
        } as T;
      const possibleSubOptions = options
        .filter((option) => !option.isGroup)
        .filter((option): option is typeof option & { id: string } => option.id !== undefined);

      const possibleSubOptionsIds = possibleSubOptions.map((option) => option.id);

      return {
        ...option,
        contains: contains.filter((subOptionId) => possibleSubOptionsIds.includes(subOptionId)),
      } as T;
    });
}
