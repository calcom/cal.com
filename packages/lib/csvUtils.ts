import type { Table } from "@tanstack/react-table";

import type { UserTableUser } from "@calcom/features/users/components/UserTable/types";

export const downloadAsCsv = (data: string | Record<string, any>[], filename: string) => {
  // If data is an array of objects, convert it to CSV string
  const csvString = typeof data === "string" ? data : objectsToCsv(data);

  // Create a Blob from the text data
  const blob = new Blob([csvString], { type: "text/plain" });

  // Create an Object URL for the Blob
  const url = window.URL.createObjectURL(blob);

  // Create a download link
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  // Simulate a click event to trigger the download
  a.click();

  // Release the Object URL to free up memory
  window.URL.revokeObjectURL(url);
};

export const objectsToCsv = (data: Record<string, any>[]): string => {
  if (!data.length) return "";

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV rows
  const csvRows = [
    // Header row
    headers.map((header) => sanitizeValue(header)).join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return sanitizeValue(value?.toString() ?? "");
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
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
    const attributeMap = attributes.reduce((acc, attr) => {
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
