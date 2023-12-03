# AddBookingRequestResponsesLocation

Meeting location

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**option_value** | **str** | Option value for the location | [optional] 
**value** | **str** | The meeting URL, Phone number or Address | [optional] 

## Example

```python
from openapi_client.models.add_booking_request_responses_location import AddBookingRequestResponsesLocation

# TODO update the JSON string below
json = "{}"
# create an instance of AddBookingRequestResponsesLocation from a JSON string
add_booking_request_responses_location_instance = AddBookingRequestResponsesLocation.from_json(json)
# print the JSON string representation of the object
print AddBookingRequestResponsesLocation.to_json()

# convert the object into a dict
add_booking_request_responses_location_dict = add_booking_request_responses_location_instance.to_dict()
# create an instance of AddBookingRequestResponsesLocation from a dict
add_booking_request_responses_location_form_dict = add_booking_request_responses_location.from_dict(add_booking_request_responses_location_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


