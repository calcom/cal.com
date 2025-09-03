"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { TextField, TextArea, Select } from "@calcom/ui/components/form";

import type { BookingTabProps } from "../types";

type EditFormData = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
};

export function BookingEditTab({ booking, onBookingUpdate }: BookingTabProps) {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    title: booking.title,
    description: booking.description || "",
    startTime: booking.startTime.toISOString().slice(0, 16), // Format for datetime-local input
    endTime: booking.endTime.toISOString().slice(0, 16),
    duration: booking.duration,
    status: booking.status,
  });

  const statusOptions = [
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending", value: "pending" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Completed", value: "completed" },
  ];

  const handleInputChange = (field: keyof EditFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // In a real implementation, this would save to backend
    const updatedBooking = {
      ...booking,
      title: formData.title,
      description: formData.description,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      duration: formData.duration,
      status: formData.status as any,
    };

    onBookingUpdate?.(updatedBooking);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      title: booking.title,
      description: booking.description || "",
      startTime: booking.startTime.toISOString().slice(0, 16),
      endTime: booking.endTime.toISOString().slice(0, 16),
      duration: booking.duration,
      status: booking.status,
    });
    setIsEditing(false);
  };

  return (
    <div className="mt-6 flex-1 overflow-y-auto">
      <div className="space-y-6">
        {/* Edit Actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-emphasis text-lg font-semibold">Edit Booking</h3>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} color="secondary">
              Edit Details
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={handleCancel} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} StartIcon="check">
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="bg-muted rounded-lg p-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-emphasis mb-2 block text-sm font-medium">Title</label>
              <TextField
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={!isEditing}
                placeholder="Enter booking title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-emphasis mb-2 block text-sm font-medium">Description</label>
              <TextArea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                disabled={!isEditing}
                placeholder="Enter booking description"
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                  disabled={!isEditing}
                  className="bg-default border-muted text-emphasis focus:border-emphasis w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">End Time</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  disabled={!isEditing}
                  className="bg-default border-muted text-emphasis focus:border-emphasis w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Duration and Status */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Duration (minutes)</label>
                <TextField
                  type="number"
                  value={formData.duration.toString()}
                  onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Status</label>
                <Select
                  options={statusOptions}
                  value={statusOptions.find((opt) => opt.value === formData.status)}
                  onChange={(selected) => selected && handleInputChange("status", selected.value)}
                  isDisabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-emphasis mb-4 text-base font-semibold">Quick Actions</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Button color="secondary" StartIcon="calendar" className="justify-start">
              Reschedule Booking
            </Button>
            <Button color="secondary" StartIcon="users" className="justify-start">
              Manage Attendees
            </Button>
            <Button color="secondary" StartIcon="link" className="justify-start">
              Copy Meeting Link
            </Button>
            <Button color="destructive" StartIcon="circle" className="justify-start">
              Cancel Booking
            </Button>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-emphasis mb-4 text-base font-semibold">Advanced Options</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emphasis text-sm font-medium">Send confirmation email</div>
                <div className="text-subtle text-xs">Notify attendees of changes</div>
              </div>
              <input type="checkbox" defaultChecked disabled={!isEditing} className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emphasis text-sm font-medium">Update calendar event</div>
                <div className="text-subtle text-xs">Sync changes with external calendars</div>
              </div>
              <input type="checkbox" defaultChecked disabled={!isEditing} className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
