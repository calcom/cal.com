import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

export const useCurrentUserId = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};

export default useCurrentUserId;
