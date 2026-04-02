import process from "node:process";
import { GoogleTagManager } from "@next/third-parties/google";
import { useQuery } from "@tanstack/react-query";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const CACHE_KEY = "user_geolocation";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function fetchGeolocation() {
  const cachedData = localStorage.getItem(CACHE_KEY);

  if (cachedData) {
    const { country, timestamp } = JSON.parse(cachedData);

    if (Date.now() - timestamp < CACHE_DURATION) {
      return { country };
    }
  }

  const res = await fetch("/api/geolocation");
  const data = await res.json();

  const newCacheData = {
    country: data.country,
    timestamp: Date.now(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(newCacheData));
  return data;
}

export function useGeolocation() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["geolocation"],
    queryFn: fetchGeolocation,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    isUS: data?.country === "US",
    loading: isLoading,
    error,
  };
}

export function GoogleTagManagerComponent() {
  const { isUS, loading } = useGeolocation();

  if (!isUS || !GTM_ID || loading) {
    return null;
  }

  return <GoogleTagManager gtmId={GTM_ID} />;
}
