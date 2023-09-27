export function isValidBase64(input: string): boolean {
  try {
    let base64Data = input;
    // Check if the input starts with a data URI scheme (data:content/type;base64,...)
    if (input.startsWith("data:")) {
      const parts = input.split(",");
      if (parts.length === 2) {
        // metadata and base64Data
        base64Data = parts[1]; // Extract the base64 data from the second part
      }
    }
    const buffer = Buffer.from(base64Data, "base64").toString("base64");
    return buffer === base64Data;
  } catch (error) {
    return false;
  }
}
