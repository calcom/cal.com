export const getHref = (priority) => {
  switch (priority) {
    case "medium": return "https://github.com/calcom/cal.com/issues?q=is:issue+is:open+sort:updated-desc+label:%22Medium+priority%22"
    case "high": return "https://github.com/calcom/cal.com/issues?q=is:issue+is:open+sort:updated-desc+label:%22High+priority%22"
    case "urgent": return "https://github.com/calcom/cal.com/issues?q=is:issue+is:open+sort:updated-desc+label:Urgent"
    default: return "https://github.com/calcom/cal.com/issues?q=is:issue+is:open+sort:updated-desc+label:%22Low+priority%22"
  }
}

export const getImgSrc = (priority) => {
  switch (priority) {
    case "medium": return "https://img.shields.io/badge/-Medium%20Priority-yellow"
    case "high": return "https://img.shields.io/badge/-High%20Priority-orange"
    case "urgent": return "https://img.shields.io/badge/-Urgent-red"
    default: return "https://img.shields.io/badge/-Low%20Priority-green"
  }
}

export const GitHubBadge = ({ priority }) => {
  return <a className="not-prose" href={getHref(priority)}>
        <img src={getImgSrc(priority)} />
      </a>
}
