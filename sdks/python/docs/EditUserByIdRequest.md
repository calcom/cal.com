# EditUserByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** | Email that belongs to the user being edited | [optional] 
**username** | **str** | Username for the user being edited | [optional] 
**brand_color** | **str** | The user&#39;s brand color | [optional] 
**dark_brand_color** | **str** | The user&#39;s brand color for dark mode | [optional] 
**week_start** | **str** | Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY] | [optional] 
**time_zone** | **str** | The user&#39;s time zone | [optional] 
**hide_branding** | **bool** | Remove branding from the user&#39;s calendar page | [optional] 
**theme** | **str** | Default theme for the user. Acceptable values are one of [DARK, LIGHT] | [optional] 
**time_format** | **str** | The user&#39;s time format. Acceptable values are one of [TWELVE, TWENTY_FOUR] | [optional] 
**locale** | **str** | The user&#39;s locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI] | [optional] 
**avatar** | **str** | The user&#39;s avatar, in base64 format | [optional] 

## Example

```python
from openapi_client.models.edit_user_by_id_request import EditUserByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditUserByIdRequest from a JSON string
edit_user_by_id_request_instance = EditUserByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditUserByIdRequest.to_json()

# convert the object into a dict
edit_user_by_id_request_dict = edit_user_by_id_request_instance.to_dict()
# create an instance of EditUserByIdRequest from a dict
edit_user_by_id_request_form_dict = edit_user_by_id_request.from_dict(edit_user_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


