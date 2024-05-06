enum OS {
  mac = "mac",
  pc = "pc"
}

export const getOS = (): OS | undefined => {
  if (typeof navigator === "undefined") {
    return undefined
  }
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) ? OS.mac : OS.pc
}

export const isMacLike = (os: OS) => {
  return os === OS.mac
}
