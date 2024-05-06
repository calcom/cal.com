import { DocumentText } from "@components/icons-alt/documenttext"
import { DocumentTextLive } from "@components/icons-alt/documenttextlive"
import { Folder } from "@components/icons-alt/folder"
import { FolderOpen } from "@components/icons-alt/folderopen"

export const Item = ({ file, open, indent, label, live }) => {
  return (
    <div
      style={{
        paddingLeft: 8 + (indent || 0) * 24
      }}
      className="relative flex flex-row items-center py-1 text-gray-900 select-none pr-2"
    >
      {file && live && <DocumentTextLive className="flex-none w-5 h-5 text-gray-200" />}
      {file && !live && <DocumentText className="flex-none w-5 h-5 text-gray-200" />}
      {!file && open && <FolderOpen className="flex-none w-5 h-5 text-[#15E3FF]" />}
      {!file && !open && (
        <Folder className="flex-none w-5 h-5 text-[#15E3FF]" />
      )}
      <span className="flex-grow ml-2 text-sm font-medium truncate whitespace-nowrap">{label}</span>
    </div>
  )
}
