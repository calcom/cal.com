"use client";

import type { GlobalCal } from "@calid/embed-runtime";
import { useEffect, useState } from "react";

import { mountCalLoader, defaultEmbedSrc } from "../boot/loader";

export function useCalLoader(src?: string): GlobalCal | undefined {
  const [cal, setCal] = useState<GlobalCal>();

  useEffect(() => {
    setCal(() => mountCalLoader(src ?? defaultEmbedSrc));
  }, []);

  return cal;
}
