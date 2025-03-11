import { SetMetadata } from "@nestjs/common";

export const CUSTOM_THROTTLER_KEY = "custom-throttler-decorator";
export type CustomThrottler = { name: string; defaultLimit: number };
export const CustomThrottler = ({ name, defaultLimit }: CustomThrottler) =>
  SetMetadata(CUSTOM_THROTTLER_KEY, { name, defaultLimit });
