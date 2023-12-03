# EditBookingByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**title** | **str** | Booking event title | [optional] 
**start** | **datetime** | Start time of the Event | [optional] 
**end** | **datetime** | End time of the Event | [optional] 
**status** | **str** | Acceptable values one of [\&quot;ACCEPTED\&quot;, \&quot;PENDING\&quot;, \&quot;CANCELLED\&quot;, \&quot;REJECTED\&quot;] | [optional] 
**description** | **str** | Description of the meeting | [optional] 

## Example

```python
from openapi_client.models.edit_booking_by_id_request import EditBookingByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditBookingByIdRequest from a JSON string
edit_booking_by_id_request_instance = EditBookingByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditBookingByIdRequest.to_json()

# convert the object into a dict
edit_booking_by_id_request_dict = edit_booking_by_id_request_instance.to_dict()
# create an instance of EditBookingByIdRequest from a dict
edit_booking_by_id_request_form_dict = edit_booking_by_id_request.from_dict(edit_booking_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


