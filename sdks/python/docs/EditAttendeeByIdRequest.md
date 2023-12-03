# EditAttendeeByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** |  | [optional] 
**name** | **str** |  | [optional] 
**time_zone** | **str** |  | [optional] 

## Example

```python
from openapi_client.models.edit_attendee_by_id_request import EditAttendeeByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditAttendeeByIdRequest from a JSON string
edit_attendee_by_id_request_instance = EditAttendeeByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditAttendeeByIdRequest.to_json()

# convert the object into a dict
edit_attendee_by_id_request_dict = edit_attendee_by_id_request_instance.to_dict()
# create an instance of EditAttendeeByIdRequest from a dict
edit_attendee_by_id_request_form_dict = edit_attendee_by_id_request.from_dict(edit_attendee_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


