import type { NextApiResponse } from "next";

export const addServerTimingHeader = ({
  res,
  timings,
}: {
  res: NextApiResponse;
  timings: { label: string; duration: number }[];
}) => {
  const val = timings
    .map((timing) => {
      return `${timing.label};dur=${timing.duration.toFixed(2)}`;
    })
    .join(", ");
  const serverTimingHeader = res.getHeader("Server-Timing") || "";
  const headerValue = serverTimingHeader ? serverTimingHeader + "," + val : val;
  res.setHeader("Server-Timing", headerValue);
  return headerValue;
};

export const addServerTimingHeaderIfRes = ({
  res,
  timings,
}: {
  res?: NextApiResponse;
  timings: { label: string; duration: number }[];
}) => {
  if (res) {
    return addServerTimingHeader({ res, timings });
  }
  return null;
};
