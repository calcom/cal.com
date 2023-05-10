import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function useRouterQuery<T extends string>(name: T) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const setQuery = (newValue: string | number | null | undefined) => {
    const urlSearchParams = new URLSearchParams(searchParams ?? undefined);
    if (newValue !== undefined && newValue !== null) {
      urlSearchParams.set(name, String(newValue));
    }

    router.replace(`?${urlSearchParams.toString()}`);
  };

  return { [name]: searchParams?.get(name), setQuery } as {
    [K in T]: string | undefined;
  } & {
    setQuery: typeof setQuery;
  };
}
