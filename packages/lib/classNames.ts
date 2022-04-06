export default function classNames(...classes: unknown[]) {
  return classes.filter(Boolean).join(" ");
}
