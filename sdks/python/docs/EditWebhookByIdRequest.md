# EditWebhookByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**subscriber_url** | **str** | The URL to subscribe to this webhook | [optional] 
**event_triggers** | **str** | The events which should trigger this webhook call | [optional] 
**active** | **bool** | Whether the webhook is active and should trigger on associated trigger events | [optional] 
**payload_template** | **str** | The template of the webhook&#39;s payload | [optional] 
**event_type_id** | **float** | The event type ID if this webhook should be associated with only that event type | [optional] 
**secret** | **str** | The secret to verify the authenticity of the received payload | [optional] 

## Example

```python
from openapi_client.models.edit_webhook_by_id_request import EditWebhookByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditWebhookByIdRequest from a JSON string
edit_webhook_by_id_request_instance = EditWebhookByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditWebhookByIdRequest.to_json()

# convert the object into a dict
edit_webhook_by_id_request_dict = edit_webhook_by_id_request_instance.to_dict()
# create an instance of EditWebhookByIdRequest from a dict
edit_webhook_by_id_request_form_dict = edit_webhook_by_id_request.from_dict(edit_webhook_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


