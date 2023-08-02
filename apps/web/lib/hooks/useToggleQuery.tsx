import { useSearchParams } from "next/navigation";

export function useToggleQuery(name: string) {
  const searchParams = useSearchParams();

  return {
    isOn: searchParams?.get(name) === "1",
  };
}
