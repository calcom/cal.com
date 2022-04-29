import { useMeQuery } from "@components/Shell";

export const useCurrentUser = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};
