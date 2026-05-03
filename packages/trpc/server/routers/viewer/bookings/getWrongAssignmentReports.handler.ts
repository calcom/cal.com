import type { TGetWrongAssignmentReportsInputSchema } from "./getWrongAssignmentReports.schema";

type GetWrongAssignmentReportsOptions = {
  input: TGetWrongAssignmentReportsInputSchema;
};

export const getWrongAssignmentReportsHandler = async (_opts: GetWrongAssignmentReportsOptions) => {
  return {
    reports: [],
    total: 0,
  };
};
