# CustomInputsPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**event_type_id** | **int** | ID of the event type to which the custom input is being added | 
**label** | **str** | Label of the custom input | 
**type** | **str** | Type of the custom input. The value is ENUM; one of [TEXT, TEXTLONG, NUMBER, BOOL, RADIO, PHONE] | 
**options** | [**CustomInputsPostRequestOptions**](CustomInputsPostRequestOptions.md) |  | [optional] 
**required** | **bool** | If the custom input is required before booking | 
**placeholder** | **str** | Placeholder text for the custom input | 

## Example

```python
from openapi_client.models.custom_inputs_post_request import CustomInputsPostRequest

# TODO update the JSON string below
json = "{}"
# create an instance of CustomInputsPostRequest from a JSON string
custom_inputs_post_request_instance = CustomInputsPostRequest.from_json(json)
# print the JSON string representation of the object
print CustomInputsPostRequest.to_json()

# convert the object into a dict
custom_inputs_post_request_dict = custom_inputs_post_request_instance.to_dict()
# create an instance of CustomInputsPostRequest from a dict
custom_inputs_post_request_form_dict = custom_inputs_post_request.from_dict(custom_inputs_post_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


