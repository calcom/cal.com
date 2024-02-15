export const removeFileExtension = (name: string) => {
  return name?.replace(/.(md|mdx|mdoc)$/, "");
};

export const toPathMetaMap = (tree: any) => {
  let saveMap: any = {};

  const updateMap = (tree: any) => {
    for (const file of (tree?.files || [])) {
      saveMap[file.path] = file.meta || {};
    }
    for (const folder of (tree?.folders || [])) {
      updateMap(folder);
    }
  };

  updateMap(tree);

  return saveMap;
};

export const toIdPathMetaMap = (tree: any) => {
  let saveMap: any = {};

  const updateMap = (tree: any) => {
    for (const file of (tree?.files || [])) {
      saveMap[file.id] = { path: file.path, meta: file.meta } || {};
    }
    for (const folder of (tree?.folders || [])) {
      updateMap(folder);
    }
  };

  updateMap(tree);

  return saveMap;
};
