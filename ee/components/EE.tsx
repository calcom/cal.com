// only show enterprise edition components if a license was acquired

// TODO: instead of looking for a LICENSE_KEY environment variable, look use license server request
const license = true; //process.env.LICENSE_KEY;

export default function EE({ children }: { children: JSX.Element }) {
  return license ? children : null;
}

export function isEE() {
  return license;
}
