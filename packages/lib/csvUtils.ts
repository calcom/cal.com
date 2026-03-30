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
    headers
      .map((header) => sanitizeValue(header))
      .join(","),
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
