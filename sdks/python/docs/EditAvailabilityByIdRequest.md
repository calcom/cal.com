# EditAvailabilityByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**days** | **List[int]** | Array of integers depicting weekdays | [optional] 
**schedule_id** | **int** | ID of schedule this availability is associated with | [optional] 
**start_time** | **str** | Start time of the availability | [optional] 
**end_time** | **str** | End time of the availability | [optional] 

## Example

```python
from openapi_client.models.edit_availability_by_id_request import EditAvailabilityByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditAvailabilityByIdRequest from a JSON string
edit_availability_by_id_request_instance = EditAvailabilityByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditAvailabilityByIdRequest.to_json()

# convert the object into a dict
edit_availability_by_id_request_dict = edit_availability_by_id_request_instance.to_dict()
# create an instance of EditAvailabilityByIdRequest from a dict
edit_availability_by_id_request_form_dict = edit_availability_by_id_request.from_dict(edit_availability_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


