import type { Table } from "@tanstack/react-table";

import type { UserTableUser } from "@calcom/features/users/components/UserTable/types";
import { sanitizeValue } from "@calcom/lib/csvUtils";

export const generateHeaderFromReactTable = (table: Table<UserTableUser>): string[] | null => {
  const headerGroups = table.getHeaderGroups();
  if (!headerGroups.length) {
    return null;
  }

  const { headers } = headerGroups[0];
  const HEADER_IDS_TO_EXCLUDE = ["select", "actions"]; // these columns only make sense in web page
  const filteredHeaders = headers.filter((header) => !HEADER_IDS_TO_EXCLUDE.includes(header.id));
  const headerNames = filteredHeaders.map((header) => {
    const h = header.column.columnDef.header;
    if (typeof h === "string") {
      return sanitizeValue(h);
    }
    if (typeof h === "function") {
      return sanitizeValue(h(header.getContext()));
    }
    return "Unknown";
  });

  // Add "Link" column (member's public page)
  const MEMBERS_COLUMN = "Members";
  const LINK_COLUMN = "Link";
  const memberIndex = headerNames.findIndex((name) => name === MEMBERS_COLUMN);
  if (memberIndex > -1) {
    headerNames.splice(memberIndex + 1, 0, LINK_COLUMN);
  }

  return headerNames;
};

export const generateCsvRawForMembersTable = (
  headers: string[],
  rows: UserTableUser[],
  ATTRIBUTE_IDS: string[],
  orgDomain: string
): string => {
  if (!headers.length) {
    throw new Error("The header is empty.");
  }

  const REQUIRED_HEADERS = ["Members", "Link", "Role", "Teams"] as const;
  // Validate required headers are present and in correct order
  const firstFourHeaders = headers.slice(0, REQUIRED_HEADERS.length);
  if (!REQUIRED_HEADERS.every((header, index) => header === firstFourHeaders[index])) {
    throw new Error(
      `Invalid headers structure. Expected headers to start with: ${JSON.stringify(REQUIRED_HEADERS)}`
    );
  }

  // Body formation
  const csvRows = rows.map((row) => {
    const { email, role, teams, username, attributes } = row;

    // Create a map of attributeId to array of values
    const attributeMap = (attributes ?? []).reduce((acc, attr) => {
      if (!acc[attr.attributeId]) {
        acc[attr.attributeId] = [];
      }
      acc[attr.attributeId].push({
        value: attr.value,
        weight: attr.weight ?? undefined,
      });
      return acc;
    }, {} as Record<string, { value: string; weight: number | undefined }[]>);

    const requiredColumns = [
      email, // Members column
      `${orgDomain}/${username}`, // Link column
      role, // Role column
      sanitizeValue(teams.map((team) => team.name).join(",")), // Teams column
    ];

    // Add attribute columns
    const attributeColumns = ATTRIBUTE_IDS.map((attrId) => {
      const attributes = attributeMap[attrId];
      if (!attributes?.length) return "";

      return sanitizeValue(
        attributes.map((attr) => (attr.weight ? `${attr.value} (${attr.weight}%)` : attr.value)).join(",")
      );
    });

    return [...requiredColumns, ...attributeColumns];
  });

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
};
