# AddBookingReferenceRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **str** |  | 
**uid** | **str** |  | 
**meeting_id** | **str** |  | [optional] 
**meeting_password** | **str** |  | [optional] 
**meeting_url** | **str** |  | [optional] 
**booking_id** | **bool** |  | [optional] 
**external_calendar_id** | **str** |  | [optional] 
**deleted** | **bool** |  | [optional] 
**credential_id** | **int** |  | [optional] 

## Example

```python
from openapi_client.models.add_booking_reference_request import AddBookingReferenceRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddBookingReferenceRequest from a JSON string
add_booking_reference_request_instance = AddBookingReferenceRequest.from_json(json)
# print the JSON string representation of the object
print AddBookingReferenceRequest.to_json()

# convert the object into a dict
add_booking_reference_request_dict = add_booking_reference_request_instance.to_dict()
# create an instance of AddBookingReferenceRequest from a dict
add_booking_reference_request_form_dict = add_booking_reference_request.from_dict(add_booking_reference_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


