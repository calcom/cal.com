# AddUserRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** | Email that belongs to the user being edited | 
**username** | **str** | Username for the user being created | 
**brand_color** | **str** | The new user&#39;s brand color | [optional] 
**dark_brand_color** | **str** | The new user&#39;s brand color for dark mode | [optional] 
**hide_branding** | **bool** | Remove branding from the user&#39;s calendar page | [optional] 
**week_start** | **str** | Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY] | [optional] 
**time_zone** | **str** | The new user&#39;s time zone. Eg- &#39;EUROPE/PARIS&#39; | [optional] 
**theme** | **str** | Default theme for the new user. Acceptable values are one of [DARK, LIGHT] | [optional] 
**time_format** | **str** | The new user&#39;s time format. Acceptable values are one of [TWELVE, TWENTY_FOUR] | [optional] 
**locale** | **str** | The new user&#39;s locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI] | [optional] 
**avatar** | **str** | The user&#39;s avatar, in base64 format | [optional] 

## Example

```python
from openapi_client.models.add_user_request import AddUserRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddUserRequest from a JSON string
add_user_request_instance = AddUserRequest.from_json(json)
# print the JSON string representation of the object
print AddUserRequest.to_json()

# convert the object into a dict
add_user_request_dict = add_user_request_instance.to_dict()
# create an instance of AddUserRequest from a dict
add_user_request_form_dict = add_user_request.from_dict(add_user_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


