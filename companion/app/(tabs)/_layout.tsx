import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="event-types">
        <Icon sf="link" />
        <Label>Event Types</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="bookings">
        <Icon sf="calendar" />
        <Label>Bookings</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="availability">
        <Icon sf="clock" />
        <Label>Availability</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="more">
        <Icon sf="ellipsis" />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}