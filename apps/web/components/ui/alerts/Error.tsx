import { Alert } from "../Alert";

/**
 * @deprecated use `<Alert severity="error" message="x" />` instead
 */
export default function ErrorAlert(props: { message: string; className?: string }) {
  return <Alert severity="error" message={props.message} />;
}
