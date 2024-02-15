export type SidebarEntry = {
  title: string;
  href?: string;
  kind?: "group" | undefined;
  pages?: SidebarEntry[];
};

export const normalizePath = (path: string) => {
  return path.toLowerCase().replace(/\s+/g, "-");
};

export const getSection = (
  sections: SidebarEntry[],
  path: string
): SidebarEntry | undefined => {
  const basePath = path.replace(/^\//, "").split("/")[1];
  return sections.find((section) => {
    return section.title && normalizePath(section.title) === basePath;
  });
};

export const getSectionTitle = (
  sections: SidebarEntry[],
  path: string
): string | undefined => {
  return getSection(sections, path)?.title;
};

const toFlattenedInternalLinks = (
  sidebar: SidebarEntry[],
  pathMetaMap: { [key: string]: any }
): SidebarEntry[] => {
  return sidebar.reduce((acc, value) => {
    const subLinks = toFlattenedInternalLinks(value.pages || [], pathMetaMap);
    const href = typeof value === "string" ? value : value?.href;
    // Omit section entries and external links
    if (href?.startsWith("/")) {
      let entry: SidebarEntry | null = null;
      if (typeof value === "string") {
        const meta = pathMetaMap[value];
        if (meta) {
          entry = {
            title: meta.title,
            href: value,
          };
        }
      } else {
        entry = value;
      }
      if (entry) {
        return [...acc, entry, ...subLinks];
      }
    }
    return [...acc, ...subLinks];
  }, [] as SidebarEntry[]);
};

export const getPrevNext = (
  sidebar: SidebarEntry[],
  pathMetaMap: { [key: string]: any },
  path: string
): { prev: SidebarEntry | undefined; next: SidebarEntry | undefined } => {
  const flattenedInternalLinks = toFlattenedInternalLinks(sidebar, pathMetaMap);
  const index = flattenedInternalLinks.findIndex((l) => l.href === path);
  let prev = undefined,
    next = undefined;
  if (index > 0) {
    prev = flattenedInternalLinks[index - 1];
  }
  if (index < flattenedInternalLinks.length - 1) {
    next = flattenedInternalLinks[index + 1];
  }
  return { prev, next };
};
