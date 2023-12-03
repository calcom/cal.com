# EditEventTypeByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**length** | **int** | Duration of the event type in minutes | [optional] 
**metadata** | **object** | Metadata relating to event type. Pass {} if empty | [optional] 
**title** | **str** | Title of the event type | [optional] 
**slug** | **str** | Unique slug for the event type | [optional] 
**schedule_id** | **float** | The ID of the schedule for this event type | [optional] 
**hosts** | [**List[AddEventTypeRequestHostsInner]**](AddEventTypeRequestHostsInner.md) |  | [optional] 
**hidden** | **bool** | If the event type should be hidden from your public booking page | [optional] 
**position** | **int** | The position of the event type on the public booking page | [optional] 
**team_id** | **int** | Team ID if the event type should belong to a team | [optional] 
**period_type** | **str** | To decide how far into the future an invitee can book an event with you | [optional] 
**period_start_date** | **datetime** | Start date of bookable period (Required if periodType is &#39;range&#39;) | [optional] 
**period_end_date** | **datetime** | End date of bookable period (Required if periodType is &#39;range&#39;) | [optional] 
**period_days** | **int** | Number of bookable days (Required if periodType is rolling) | [optional] 
**period_count_calendar_days** | **bool** | If calendar days should be counted for period days | [optional] 
**requires_confirmation** | **bool** | If the event type should require your confirmation before completing the booking | [optional] 
**recurring_event** | [**AddEventTypeRequestRecurringEvent**](AddEventTypeRequestRecurringEvent.md) |  | [optional] 
**disable_guests** | **bool** | If the event type should disable adding guests to the booking | [optional] 
**hide_calendar_notes** | **bool** | If the calendar notes should be hidden from the booking | [optional] 
**minimum_booking_notice** | **int** | Minimum time in minutes before the event is bookable | [optional] 
**before_event_buffer** | **int** | Number of minutes of buffer time before a Cal Event | [optional] 
**after_event_buffer** | **int** | Number of minutes of buffer time after a Cal Event | [optional] 
**scheduling_type** | **str** | The type of scheduling if a Team event. Required for team events only | [optional] 
**price** | **int** | Price of the event type booking | [optional] 
**currency** | **str** | Currency acronym. Eg- usd, eur, gbp, etc. | [optional] 
**slot_interval** | **int** | The intervals of available bookable slots in minutes | [optional] 
**success_redirect_url** | **str** | A valid URL where the booker will redirect to, once the booking is completed successfully | [optional] 
**description** | **str** | Description of the event type | [optional] 
**seats_per_time_slot** | **int** | The number of seats for each time slot | [optional] 
**seats_show_attendees** | **bool** | Share Attendee information in seats | [optional] 
**seats_show_availability_count** | **bool** | Show the number of available seats | [optional] 
**locations** | **List[List[AddEventTypeRequestLocationsInnerInner]]** | A list of all available locations for the event type | [optional] 

## Example

```python
from openapi_client.models.edit_event_type_by_id_request import EditEventTypeByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditEventTypeByIdRequest from a JSON string
edit_event_type_by_id_request_instance = EditEventTypeByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditEventTypeByIdRequest.to_json()

# convert the object into a dict
edit_event_type_by_id_request_dict = edit_event_type_by_id_request_instance.to_dict()
# create an instance of EditEventTypeByIdRequest from a dict
edit_event_type_by_id_request_form_dict = edit_event_type_by_id_request.from_dict(edit_event_type_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


