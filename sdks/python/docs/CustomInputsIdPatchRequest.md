# CustomInputsIdPatchRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**event_type_id** | **int** | ID of the event type to which the custom input is being added | [optional] 
**label** | **str** | Label of the custom input | [optional] 
**type** | **str** | Type of the custom input. The value is ENUM; one of [TEXT, TEXTLONG, NUMBER, BOOL, RADIO, PHONE] | [optional] 
**options** | [**CustomInputsPostRequestOptions**](CustomInputsPostRequestOptions.md) |  | [optional] 
**required** | **bool** | If the custom input is required before booking | [optional] 
**placeholder** | **str** | Placeholder text for the custom input | [optional] 

## Example

```python
from openapi_client.models.custom_inputs_id_patch_request import CustomInputsIdPatchRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CustomInputsIdPatchRequest from a JSON string
custom_inputs_id_patch_request_instance = CustomInputsIdPatchRequest.from_json(json)
# print the JSON string representation of the object
print CustomInputsIdPatchRequest.to_json()

# convert the object into a dict
custom_inputs_id_patch_request_dict = custom_inputs_id_patch_request_instance.to_dict()
# create an instance of CustomInputsIdPatchRequest from a dict
custom_inputs_id_patch_request_form_dict = custom_inputs_id_patch_request.from_dict(custom_inputs_id_patch_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


