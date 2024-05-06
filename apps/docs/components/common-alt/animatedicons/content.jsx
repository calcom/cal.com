import { DocumentText } from "@components/icons-alt/documenttext"
import { Photograph } from "@components/icons-alt/photograph"

export const Content = ({ className }) => {
  return <div className={`${className} aspect-square relative`}>
      <DocumentText className="mix-blend-color-burn text-amber-500"/>
      <Photograph className="absolute right-[-18%] top-[-23%] mix-blend-color-burn text-yellow-400 h-[80%]" />
    </div>
}
