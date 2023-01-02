import Link from "next/link";

interface ILinkTextProps {
  href: string;
  children: React.ReactNode;
  classNameChildren?: string;
  target?: string;
}
/**
 * This component had to be made in order to make i18n work with next/link
 * @see https://github.com/i18next/react-i18next/issues/1090#issuecomment-615426145
 **/
export const LinkText = (props: ILinkTextProps) => {
  const { target, href, children, classNameChildren, ...moreProps } = props;
  return (
    <Link href={href || ""} {...moreProps}>
      <a target={target || ""} className={classNameChildren}>
        {children}
      </a>
    </Link>
  );
};
