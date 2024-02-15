import Link from "next/link";

export const GuideCard = ({ title, href, className }) => <Link
        href={href}
        className={`${className} rounded-lg bg-purple-700 p-8 transition transform hover:shadow-2xl flex flex-col gap-20 group book duration-300 origin-left`}>
      <h1 className="font-bold no-underline flex-grow text-2xl text-white">{title}</h1>
      <div className="relative pb-4">
        <p className="absolute font-medium text-purple-300 group-hover:text-purple-200 transition opacity-0 group-hover:opacity-100 tranform translate-y-2 group-hover:translate-y-0 border-b-0 group-hover:border-b border-purple-500 origin-left duration-300">Read now</p>
      </div>
    </Link>