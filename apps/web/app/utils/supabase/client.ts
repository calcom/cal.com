/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    "https://ogbfbwkftgpdiejqafdq.supabase.co/rest/v1/",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYmZid2tmdGdwZGllanFhZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY2OTY3NzMsImV4cCI6MjAzMjI3Mjc3M30._m1hW5-UcdpgWNUwU9V8RAAvMwOzWOgpbL_ykoPJGIw"
  );
