import { ChevronRight } from "@components/icons-alt/chevron-right"
import Link from "next/link"

export const PageLink = ({
  href,
  iconUrl,
  heading,
  children,
}) => {
  return (
    <Link
      href={href}
      className="flex flex-row p-4 font-semibold border border-neutral-200 dark:border-white/20 rounded-lg cursor-pointer bg-white dark:bog-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 transition items-center gap-4 not-prose no-underline mb-2"
    >
      {iconUrl && (
        <img
          className="w-8 h8 rounded-md overflow-hidden flex-none"
          src={iconUrl}
        />
      )}
      <div className="flex-grow flex flex-col gap-1 truncate">
        {heading && <div className="font-normal truncate text-base text-neutral-400 dark:text-white/20">{heading}</div>}
        <div className="truncate">{children}</div>
      </div>
      <ChevronRight className="flex-none text-neutral-400 dark:text-white/20 dark:group-hover:text-white/80 w-6 h-6" />
    </Link>
  )
}
