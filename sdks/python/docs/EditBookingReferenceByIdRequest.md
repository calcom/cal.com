# EditBookingReferenceByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | [optional] 
**meeting_id** | **str** |  | [optional] 
**meeting_password** | **str** |  | [optional] 
**external_calendar_id** | **str** |  | [optional] 
**deleted** | **bool** |  | [optional] 
**credential_id** | **int** |  | [optional] 

## Example

```python
from openapi_client.models.edit_booking_reference_by_id_request import EditBookingReferenceByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditBookingReferenceByIdRequest from a JSON string
edit_booking_reference_by_id_request_instance = EditBookingReferenceByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditBookingReferenceByIdRequest.to_json()

# convert the object into a dict
edit_booking_reference_by_id_request_dict = edit_booking_reference_by_id_request_instance.to_dict()
# create an instance of EditBookingReferenceByIdRequest from a dict
edit_booking_reference_by_id_request_form_dict = edit_booking_reference_by_id_request.from_dict(edit_booking_reference_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


