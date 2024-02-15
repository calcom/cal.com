export const APICall = ({method, baseUrl, path}) => {
  return <div className="bg-[#2b2b2b] px-2 py-3 text-sm rounded-t-md">
        <span className={`${getColorClassName(method)} p-4`}>{method}</span> 
        <span className="text-gray-400">{baseUrl}</span>
        <span className="text-gray-400">{path}</span>
      </div>
};

export const getColorClassName = (method) => {
  switch (method) {
    case "GET": return "text-green-600"
    case "HEAD": return "text-fuchsia-600"
    case "POST": return "text-sky-600"
    case "PUT": return "text-amber-600"
    case "DELETE": return "text-red-700"
    case "CONNECT": return "text-violet-600"
    case "OPTIONS": return "text-neutral-600"
    case "TRACE": return "text-indigo-600"
    case "PATCH": return "text-orange-600"
  }
}