import Link from "next/link"

export const getBackgroundColorClass = (color) => {
  switch (color) {
    case "purple": return "bg-purple-500"
    case "indigo": return "bg-indigo-500"
    case "red": return "bg-red-500"
    case "sky": return "bg-sky-500"
    case "pink": return "bg-pink-500"
    case "dark": return "bg-primary-700"
    case "white": return "bg-white"
    default: return ""
  }
}

export const getThemeClass = (color) => {
  switch (color) {
    case "purple": return "text-purple-500"
    case "indigo": return "text-indigo-500"
    case "red": return "text-red-500"
    case "pink": return "text-pink-600"
    case "sky": return "text-sky-500"
    case "dark": return "text-primary-700"
    case "white": return "text-white"
    default: return "text-white"
  }
}

export const PlainCard = ({ title, cta, description, theme, background, customBackground, Icon, href }) => {
  const isWhite = background === "white"
  return <Link
      href={href}
      className={`relative cursor-pointer rounded-lg flex flex-col gap-4 group p-6 h-full bg-primary-700`}>
      { Icon && <Icon className={`relative z-10 w-8 flex-none ${getThemeClass(theme)}`} />}
      { title && <p className={`relative z-10 text-white text-xl flex-none font-semibold ${isWhite ? "text-primary-700" : "text-white" }`}>{ title }</p>}
      <p className={`relative z-10 text-white text-lg flex-grow ${isWhite ? "text-primary-700" : "text-white" }`}>{ description }</p>
      {cta &&
        <p className={`relative z-10 font-semibold text-lg flex-none ${isWhite ? "text-primary-700" : "text-white" }`}>{ cta } →</p>}
      <div
        style={ customBackground ? { backgroundColor: customBackground } : {} }
        className={`z-0 absolute left-0 right-0 top-0 bottom-0 ${getBackgroundColorClass(background)} transition duration-200 transform rounded-lg ${isWhite ? "group-hover:bg-white border border-primary-700 group-hover:shadow-lg" : "group-hover:bg-primary-700 group-hover:scale-x-[1.03] group-hover:scale-y-[1.09] shadow-md group-hover:shadow-xl"}`} />
    </Link>
}

<PlainCard title="Title" description="Description" cta="Get started"/>