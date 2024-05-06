import { DocumentText } from "@components/icons-alt/documenttext"
import { LockOpen } from "@components/icons-alt/lockopen"

export const Store = ({ className }) => {
  return <div className={`${className} aspect-square relative`}>
      <DocumentText className="mix-blend-color-burn text-amber-500"/>
      <LockOpen className="absolute right-[-20%] top-[-38%] mix-blend-color-burn text-yellow-400 h-[80%]"/>
    </div>
}

<Store className="h-12"/>