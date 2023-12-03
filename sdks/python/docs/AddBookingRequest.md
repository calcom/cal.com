# AddBookingRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**event_type_id** | **int** | ID of the event type to book | 
**start** | **datetime** | Start time of the Event | 
**end** | **datetime** | End time of the Event | [optional] 
**responses** | [**AddBookingRequestResponses**](AddBookingRequestResponses.md) |  | 
**metadata** | **object** | Any metadata associated with the booking | 
**time_zone** | **str** | TimeZone of the Attendee | 
**language** | **str** | Language of the Attendee | 
**title** | **str** | Booking event title | [optional] 
**recurring_event_id** | **int** | Recurring event ID if the event is recurring | [optional] 
**description** | **str** | Event description | [optional] 
**status** | **str** | Acceptable values one of [\&quot;ACCEPTED\&quot;, \&quot;PENDING\&quot;, \&quot;CANCELLED\&quot;, \&quot;REJECTED\&quot;] | [optional] 
**seats_per_time_slot** | **int** | The number of seats for each time slot | [optional] 
**seats_show_attendees** | **bool** | Share Attendee information in seats | [optional] 
**seats_show_availability_count** | **bool** | Show the number of available seats | [optional] 
**sms_reminder_number** | **float** | SMS reminder number | [optional] 

## Example

```python
from openapi_client.models.add_booking_request import AddBookingRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddBookingRequest from a JSON string
add_booking_request_instance = AddBookingRequest.from_json(json)
# print the JSON string representation of the object
print AddBookingRequest.to_json()

# convert the object into a dict
add_booking_request_dict = add_booking_request_instance.to_dict()
# create an instance of AddBookingRequest from a dict
add_booking_request_form_dict = add_booking_request.from_dict(add_booking_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


