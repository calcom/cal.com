import { Tag } from "@components/icons-alt/tag"

export const Pricing = ({ className }) => {
  return <div className={`${className} aspect-square relative`}>
      <Tag className="mix-blend-color-burn text-amber-500"/>
      <Tag className="absolute top-0 left-[40%] mix-blend-color-burn ml-[-12%] text-yellow-400 h-full"/>
    </div>
}
