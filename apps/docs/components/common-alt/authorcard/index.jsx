import Link from "next/link"

export const AuthorCard = ({ author }) => {
  if (!author) {
    return <></>
  }
  return <div className="flex flex-row items-center gap-3 group">
      <Link className="flex-none" href={`https://twitter.com/${author.twitter}`}>
        <img className="rounded-full w-10 h-10 object-cover hover:opacity-80 transition" src={author.avatarUrl} />
      </Link>
      <div className="flex flex-col flex-grow">
        <p className="text-sm text-neutral-800 font-semibold">
          {author.name}
        </p>
        <a
          href={`https://twitter.com/${author.twitter}`}
          className="plainLink font-medium text-sm"
          >
            {author.twitter}
        </a>
      </div>
    </div>
}
