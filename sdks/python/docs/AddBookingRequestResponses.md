# AddBookingRequestResponses


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Attendee full name | 
**email** | **str** | Attendee email address | 
**location** | [**AddBookingRequestResponsesLocation**](AddBookingRequestResponsesLocation.md) |  | 

## Example

```python
from openapi_client.models.add_booking_request_responses import AddBookingRequestResponses

# TODO update the JSON string below
json = "{}"
# create an instance of AddBookingRequestResponses from a JSON string
add_booking_request_responses_instance = AddBookingRequestResponses.from_json(json)
# print the JSON string representation of the object
print AddBookingRequestResponses.to_json()

# convert the object into a dict
add_booking_request_responses_dict = add_booking_request_responses_instance.to_dict()
# create an instance of AddBookingRequestResponses from a dict
add_booking_request_responses_form_dict = add_booking_request_responses.from_dict(add_booking_request_responses_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


