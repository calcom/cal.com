export function objectToCsv(data: Record<string, string>[]) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]?.toString() || "";
          // Escape quotes and wrap in quotes if contains comma or newline
          return value.includes(",") || value.includes("\n") || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"` // escape double quotes
            : value;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}
