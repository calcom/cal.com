# AddAttendeeRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**booking_id** | **float** |  | 
**email** | **str** |  | 
**name** | **str** |  | 
**time_zone** | **str** |  | 

## Example

```python
from openapi_client.models.add_attendee_request import AddAttendeeRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddAttendeeRequest from a JSON string
add_attendee_request_instance = AddAttendeeRequest.from_json(json)
# print the JSON string representation of the object
print AddAttendeeRequest.to_json()

# convert the object into a dict
add_attendee_request_dict = add_attendee_request_instance.to_dict()
# create an instance of AddAttendeeRequest from a dict
add_attendee_request_form_dict = add_attendee_request.from_dict(add_attendee_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


