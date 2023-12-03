# CustomInputsPostRequestOptions

Options for the custom input

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**label** | **str** |  | [optional] 
**type** | **str** |  | [optional] 

## Example

```python
from openapi_client.models.custom_inputs_post_request_options import CustomInputsPostRequestOptions

# TODO update the JSON string below
json = "{}"
# create an instance of CustomInputsPostRequestOptions from a JSON string
custom_inputs_post_request_options_instance = CustomInputsPostRequestOptions.from_json(json)
# print the JSON string representation of the object
print CustomInputsPostRequestOptions.to_json()

# convert the object into a dict
custom_inputs_post_request_options_dict = custom_inputs_post_request_options_instance.to_dict()
# create an instance of CustomInputsPostRequestOptions from a dict
custom_inputs_post_request_options_form_dict = custom_inputs_post_request_options.from_dict(custom_inputs_post_request_options_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


