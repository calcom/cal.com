import { Redirect } from 'expo-router';

export default function Index() {
  // Start with onboarding screen
  // Later we can add logic to check if user has completed onboarding
  return <Redirect href="/onboarding" />;
}