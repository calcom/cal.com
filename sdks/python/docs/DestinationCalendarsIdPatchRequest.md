# DestinationCalendarsIdPatchRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**integration** | **str** | The integration | [optional] 
**external_id** | **str** | The external ID of the integration | [optional] 
**event_type_id** | **int** | The ID of the eventType it is associated with | [optional] 
**booking_id** | **int** | The booking ID it is associated with | [optional] 

## Example

```python
from openapi_client.models.destination_calendars_id_patch_request import DestinationCalendarsIdPatchRequest

# TODO update the JSON string below
json = "{}"
# create an instance of DestinationCalendarsIdPatchRequest from a JSON string
destination_calendars_id_patch_request_instance = DestinationCalendarsIdPatchRequest.from_json(json)
# print the JSON string representation of the object
print DestinationCalendarsIdPatchRequest.to_json()

# convert the object into a dict
destination_calendars_id_patch_request_dict = destination_calendars_id_patch_request_instance.to_dict()
# create an instance of DestinationCalendarsIdPatchRequest from a dict
destination_calendars_id_patch_request_form_dict = destination_calendars_id_patch_request.from_dict(destination_calendars_id_patch_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


