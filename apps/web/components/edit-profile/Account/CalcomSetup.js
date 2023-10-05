import { Button, Input, Label } from "@shadcdn/ui";
import Link from "next/link";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import FormBlock from "./FormBlock";

async function getCalcomEvents(apiKey) {
  const res = await fetch(`/api/calcom-events?apiKey=${apiKey}`);
  const { events } = await res.json();
  return events;
}

const CalcomSetup = ({ profile, setProfile }) => {
  const [calcomEvents, setCalcomEvents] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const savedApiKey = profile.calendar?.calcom_api_key;
    const savedEventId = profile.calendar?.calcom_event_id;
    if (savedApiKey && savedEventId) {
      getEvents(savedApiKey, savedEventId);
    }
    setApiKey(savedApiKey || "");
  }, []);

  const getEvents = async (apiKey, selectedEventId) => {
    try {
      setLoading(true);
      const events = await getCalcomEvents(apiKey);
      setCalcomEvents(events);
      const selectedEvent = events.find((event) => event.id === selectedEventId);
      setSelectedEvent(selectedEvent || null);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong 😕");
    } finally {
      setLoading(false);
    }
  };

  const handleGetEvents = async () => {
    try {
      setLoading(true);
      const events = await getCalcomEvents(apiKey);
      setCalcomEvents(events);
      setSelectedEvent(events[0]);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong 😕");
    } finally {
      setLoading(false);
    }
  };

  const setEvent = (event) => {
    setSelectedEvent(event);
    const payload = {
      calcom_event_name: event.title,
      calcom_event_id: event.id,
      calcom_event_url: event.link,
      calcom_event_length: event.length,
      calcom_api_key: apiKey,
    };
    setProfile({ ...profile, calendar: payload });
  };

  return (
    <FormBlock title="Calendar">
      <div className="flex flex-col gap-3">
        <div>
          <Label>Your Call booking link</Label>
          <Input className="mt-2" value={profile?.calendar?.calcom_event_url} />
        </div>
        <div className="mt-5">
          <Label>Setup you calendar and availibility</Label>
          <p className="mt-3 text-sm text-gray-600">To connect your calendars and setup your availibility:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
            <li>
              Head to your Calendars account{" "}
              <Link
                href="https://cal.borg.id/auth/login?callbackUrl=getting-started"
                target="_blank"
                className="underline">
                using this link
              </Link>
            </li>
            <li>Login with your Borg.id email and password</li>
            <li>Connect your Google, Apple Calendar and other calendars</li>
            <li>Setup slots and block the times you are not available</li>
            <li>You&apos;re done! Your call link on Borg.id will automatically use your availibility</li>
          </ul>
          <Button variant="outline" size="sm" className="mt-5">
            <Link href="https://cal.borg.id/auth/login" target="_blank">
              Configure your calendar
            </Link>
          </Button>
        </div>
      </div>
    </FormBlock>
  );
};

export default CalcomSetup;
