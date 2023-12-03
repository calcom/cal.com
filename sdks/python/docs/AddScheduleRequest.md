# AddScheduleRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Name of the schedule | 
**time_zone** | **str** | The timeZone for this schedule | 

## Example

```python
from openapi_client.models.add_schedule_request import AddScheduleRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddScheduleRequest from a JSON string
add_schedule_request_instance = AddScheduleRequest.from_json(json)
# print the JSON string representation of the object
print AddScheduleRequest.to_json()

# convert the object into a dict
add_schedule_request_dict = add_schedule_request_instance.to_dict()
# create an instance of AddScheduleRequest from a dict
add_schedule_request_form_dict = add_schedule_request.from_dict(add_schedule_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


