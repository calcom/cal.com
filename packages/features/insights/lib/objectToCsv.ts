export function objectToCsv(data: Record<string, string>[]) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          let value = row[header]?.toString() || "";
          // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR prefixes)
          if (/^[=+\-@\t\r]/.test(value)) {
            value = `'${value}`;
          }
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          return value.includes(",") || value.includes("\n") || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}
