# AddTeamRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Name of the team | 
**slug** | **str** | A unique slug that works as path for the team public page | 

## Example

```python
from openapi_client.models.add_team_request import AddTeamRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddTeamRequest from a JSON string
add_team_request_instance = AddTeamRequest.from_json(json)
# print the JSON string representation of the object
print AddTeamRequest.to_json()

# convert the object into a dict
add_team_request_dict = add_team_request_instance.to_dict()
# create an instance of AddTeamRequest from a dict
add_team_request_form_dict = add_team_request.from_dict(add_team_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


