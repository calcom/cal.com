"use client";

import { QueueDashApp } from "@queuedash/ui";
import "@queuedash/ui/dist/styles.css";
import React from "react";

export const BackgroundJobsView = () => <QueueDashApp apiUrl="/api/queuedash" basename="queuedash" />;
