# EditTeamByIdRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Name of the team | [optional] 
**slug** | **str** | A unique slug that works as path for the team public page | [optional] 

## Example

```python
from openapi_client.models.edit_team_by_id_request import EditTeamByIdRequest

# TODO update the JSON string below
json = "{}"
# create an instance of EditTeamByIdRequest from a JSON string
edit_team_by_id_request_instance = EditTeamByIdRequest.from_json(json)
# print the JSON string representation of the object
print EditTeamByIdRequest.to_json()

# convert the object into a dict
edit_team_by_id_request_dict = edit_team_by_id_request_instance.to_dict()
# create an instance of EditTeamByIdRequest from a dict
edit_team_by_id_request_form_dict = edit_team_by_id_request.from_dict(edit_team_by_id_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


