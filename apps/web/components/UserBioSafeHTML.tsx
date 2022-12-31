export type UserBioSafeProps = {
  bio: string | null;
};

export const UserBioSafeHTML = ({ bio }: UserBioSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  if (bio) props.dangerouslySetInnerHTML = { __html: bio };
  return <div {...props} />;
};

export default UserBioSafeHTML;
