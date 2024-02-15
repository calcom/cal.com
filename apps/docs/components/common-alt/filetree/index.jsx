import { Item } from "@components/common-alt/filetree/item"

export const FileTree = ({ tree, indent = 0 }) => {
  return <div className="bg-white">
      <>
      {tree.folders
        ?.sort((f1, f2) => f1.name.localeCompare(f2.name))
        ?.map(folder => {
          return <>
              <Item
                open={folder.open}
                indent={indent}
                label={folder.name} />
              {
                folder.open && <FileTree
                  tree={folder}
                  indent={indent+1} />
              }
            </>
        })}
      </>
      <>
      {tree.files
        ?.sort((f1, f2) => f1.name.localeCompare(f2.name))
        ?.map(file => {
          return <Item
            file
            indent={indent}
            live={file.live}
            label={file.name} />
        })}
      </>
    </div>
}
