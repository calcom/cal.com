interface MeticulousType {
  isRunningAsTest: boolean;
}

interface Window {
  Meticulous?: MeticulousType;
}

declare global {
  const Meticulous: MeticulousType | undefined;
  interface Window {
    Meticulous?: MeticulousType;
  }
}
