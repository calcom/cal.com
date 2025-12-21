import { EventTypeDetailScreen } from "../components/screens/EventTypeDetailScreen";
import { useLocalSearchParams, Stack } from "expo-router";
import React from "react";

export default function EventTypeDetail() {
  const { id, title, description, duration, price, currency, slug } = useLocalSearchParams<{
    id: string;
    title: string;
    description?: string;
    duration: string;
    price?: string;
    currency?: string;
    slug?: string;
  }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EventTypeDetailScreen
        id={id}
        title={title}
        description={description}
        duration={duration}
        price={price}
        currency={currency}
        slug={slug}
      />
    </>
  );
}
