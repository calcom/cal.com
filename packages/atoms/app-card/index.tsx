import { Card } from "app-card/components/Card";

type AppCardProps = {
  appName: string;
};

export function AppCard({ appName }: AppCardProps) {
  // TODO: fetch app based on appName prop and pass it down to dumb Card component
  return <Card />;
}
