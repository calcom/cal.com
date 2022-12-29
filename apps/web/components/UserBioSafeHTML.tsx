export type UserBioSafeProps = {
  bio: string | null;
};

export const UserBioSafeHTML = ({ bio }: UserBioSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  // @ts-expect-error: @see packages/prisma/middleware/eventTypeDescriptionParseAndSanitize.ts
  if (bio) props.dangerouslySetInnerHTML = { __html: bio };
  return <div {...props} />;
};

export default UserBioSafeHTML;
