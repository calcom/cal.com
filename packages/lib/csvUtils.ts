import type { Table } from "@tanstack/react-table";

import type { UserTableUser } from "@calcom/features/users/components/UserTable/types";

export const downloadAsCsv = (csvRaw: string, filename: string) => {
  // Create a Blob from the text data
  const blob = new Blob([csvRaw], { type: "text/plain" });

  // Create an Object URL for the Blob
  const url = window.URL.createObjectURL(blob);

  // Create a download link
  const a = document.createElement("a");
  a.href = url;
  a.download = filename; // Specify the filename

  // Simulate a click event to trigger the download
  a.click();

  // Release the Object URL to free up memory
  window.URL.revokeObjectURL(url);
};

export const sanitizeValue = (value: string) => {
  // handling three cases:
  // 1. quotes - we need to double quotes for CSV
  // 2. commas
  // 3. newlines
  if (value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (value.includes(",") || value.includes("\n")) {
    return `"${value}"`;
  }
  return value;
};

export const generateHeaderFromReactTable = (
  table: Table<UserTableUser>,
  HEADER_IDS_TO_EXCLUDE?: string[]
): string[] | null => {
  const headerGroups = table.getHeaderGroups();
  if (!headerGroups.length) {
    return null;
  }

  const { headers } = headerGroups[0];
  const filteredHeaders = HEADER_IDS_TO_EXCLUDE
    ? headers.filter((header) => !HEADER_IDS_TO_EXCLUDE.includes(header.id))
    : headers;
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

  return headerNames;
};

export const generateCsvRaw = (
  headers: string[],
  rows: UserTableUser[],
  ATTRIBUTE_IDS: string[]
): string | null => {
  if (!headers.length) {
    return null;
  }
  // Body formation
  const csvRows = rows.map((row) => {
    const { email, role, teams, attributes } = row;

    // Create a map of attributeId to array of values
    const attributeMap = attributes.reduce((acc, attr) => {
      if (!acc[attr.attributeId]) {
        acc[attr.attributeId] = [];
      }
      acc[attr.attributeId].push(attr.value);
      return acc;
    }, {} as Record<string, string[]>);

    return [
      email,
      role,
      sanitizeValue(teams.map((team) => team.name).join(",")),
      ...ATTRIBUTE_IDS.map((attrId) => {
        return attributeMap[attrId] ? sanitizeValue(attributeMap[attrId].join(",")) : "";
      }),
    ];
  });

  return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
};
