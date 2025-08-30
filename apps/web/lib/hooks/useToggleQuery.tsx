import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

export function useToggleQuery(name: string) {
  const searchParams = useCompatSearchParams();

  return {
    isOn: searchParams?.get(name) === "1",
  };
}
