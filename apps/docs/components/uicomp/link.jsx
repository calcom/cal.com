import NextLink from "next/link"

{/* For Markdoc links that don't support variable hrefs */}
export const Link = ({ href, target, referrer, children }) => {
  return <NextLink href={href} target={target} referrer={referrer}>{ children }</NextLink>
}