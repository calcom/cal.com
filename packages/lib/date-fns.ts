// Optimization: Lazy load dayjs to prevent plugin overhead on startup.
export const getDayjs = () => dayjs_original;
