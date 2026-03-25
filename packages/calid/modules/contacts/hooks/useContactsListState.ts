import { useMemo, useState } from "react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";

import { CONTACTS_PAGE_SIZE } from "../constants";
import type { ContactSortDirection, ContactSortKey } from "../types";

export const useContactsListState = () => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ContactSortKey>("name");
  const [sortDirection, setSortDirection] = useState<ContactSortDirection>("asc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);
  const limit = CONTACTS_PAGE_SIZE;
  const offset = (page - 1) * limit;

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const onSortChange = (nextSortKey: ContactSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextSortKey);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const queryInput = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      sortBy: sortKey,
      sortDirection,
      limit,
      offset,
    }),
    [debouncedSearch, sortDirection, sortKey, limit, offset]
  );

  return {
    search,
    sortKey,
    sortDirection,
    page,
    limit,
    offset,
    queryInput,
    onSearchChange,
    onSortChange,
    setPage,
  };
};
