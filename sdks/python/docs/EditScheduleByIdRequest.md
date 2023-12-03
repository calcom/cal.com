# EditScheduleByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Name of the schedule | [optional] 
**time_zone** | **str** | The timezone for this schedule | [optional] 

## Example

```python
from openapi_client.models.edit_schedule_by_id_request import EditScheduleByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditScheduleByIdRequest from a JSON string
edit_schedule_by_id_request_instance = EditScheduleByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditScheduleByIdRequest.to_json()

# convert the object into a dict
edit_schedule_by_id_request_dict = edit_schedule_by_id_request_instance.to_dict()
# create an instance of EditScheduleByIdRequest from a dict
edit_schedule_by_id_request_form_dict = edit_schedule_by_id_request.from_dict(edit_schedule_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


