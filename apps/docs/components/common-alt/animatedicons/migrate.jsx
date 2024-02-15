import { Play } from "@components/icons-alt/play"

export const Migrate = ({ className }) => {
  return <div className={`${className} aspect-square relative`}>
      <Play className="mix-blend-color-burn text-amber-500"/>
      <Play className="absolute top-0 left-[40%] mix-blend-color-burn ml-[-12%] text-yellow-400 h-full"/>
    </div>
}
