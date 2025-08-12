---
"@calcom/atoms": minor
---

Added new callback functions to the handleFormSubmit method in the EventTypeSettings and AvailabilitySettings atoms. The handleFormSubmit method now accepts an optional callbacks object with the following properties:

- **onSuccess**: Called when the form submission is successful, allowing additional logic to be executed after the update.

- **onError**: Called when an error occurs during form submission, providing details about the error to handle specific cases or display custom messages.
