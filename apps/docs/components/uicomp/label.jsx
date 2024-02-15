import cn from "classnames"

export const getClassname = (type) => {
  switch (type) {
    case "free": return "bg-gray-200 text-gray-900"
    case "free-cloud": return "bg-blue-100 text-blue-900"
    case "paid": return "bg-orange-100 text-orange-900"
  }
}
export const getLabel = (type) => {
  switch (type) {
    case "free": return "Free"
    case "free-cloud": return "Free for cloud users"
    case "paid": return "Paid"
  }
}

export const Label = ({ type, children }) => {
  return <div className={cn(
        "rounded-md p-1 text-xs capitalize w-fit px-2",
        getClassname(type)
      )}>
      {getLabel(type)}
    </div>
}

<Label type="free">
</Label>