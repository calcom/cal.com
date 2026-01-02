// Shim module to re-export from the real actions file
// This allows imports using ~/app/... to work since ~/* maps to modules/*
export { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
