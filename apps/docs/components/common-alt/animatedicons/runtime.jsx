import { Cog } from "@components/icons-alt/cog"

export const Runtime = ({ className }) => {
  return <div className={`${className} aspect-square relative`}>
      <Cog className="mix-blend-color-burn text-amber-500"/>
      <Cog className="absolute right-[-22%] top-[-22%] mix-blend-color-burn text-yellow-400 h-[80%]"/>
    </div>
}

<Runtime className="h-12"/>