# AddAvailabilityRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**days** | **List[int]** | Array of integers depicting weekdays | [optional] 
**schedule_id** | **int** | ID of schedule this availability is associated with | 
**start_time** | **str** | Start time of the availability | 
**end_time** | **str** | End time of the availability | 

## Example

```python
from openapi_client.models.add_availability_request import AddAvailabilityRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddAvailabilityRequest from a JSON string
add_availability_request_instance = AddAvailabilityRequest.from_json(json)
# print the JSON string representation of the object
print AddAvailabilityRequest.to_json()

# convert the object into a dict
add_availability_request_dict = add_availability_request_instance.to_dict()
# create an instance of AddAvailabilityRequest from a dict
add_availability_request_form_dict = add_availability_request.from_dict(add_availability_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


