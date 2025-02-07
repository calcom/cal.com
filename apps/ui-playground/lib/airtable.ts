import Airtable from "airtable";

// eslint-disable-next-line turbo/no-undeclared-env-vars
if (!process.env.AIRTABLE_TOKEN) {
  throw new Error("Missing AIRTABLE_TOKEN environment variable");
}

// eslint-disable-next-line turbo/no-undeclared-env-vars
const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.AIRTABLE_BASE_ID || "appJJ9Br9n7rgSDpg"
);

export const getRecordStatus = async (recordId: string) => {
  try {
    const record = await base("tblhjfeOxzkrPnx0d").find(recordId);
    return {
      designStatus: record.get("Design status"),
      devStatus: record.get("Dev status"),
      figmaLink: record.get("Figma link"),
    };
  } catch (error) {
    console.error("Error fetching Airtable status:", error);
    return null;
  }
};
