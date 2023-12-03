# openapi_client.AvailabilityApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**team_availability**](AvailabilityApi.md#team_availability) | **GET** /teams/{teamId}/availability | Find team availability
[**user_availability**](AvailabilityApi.md#user_availability) | **GET** /availability | Find user availability


# **team_availability**
> object team_availability(api_key, team_id, date_from=date_from, date_to=date_to, event_type_id=event_type_id)

Find team availability

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost:3002/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3002/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: ApiKeyAuth
configuration.api_key['ApiKeyAuth'] = os.environ["API_KEY"]

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['ApiKeyAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.AvailabilityApi(api_client)
    api_key = '1234abcd5678efgh' # str | Your API key
    team_id = 123 # int | ID of the team to fetch the availability for
    date_from = '2023-05-14 00:00:00' # date | Start Date of the availability query (optional)
    date_to = '2023-05-20 00:00:00' # date | End Date of the availability query (optional)
    event_type_id = 123 # int | Event Type ID of the event type to fetch the availability for (optional)

    try:
        # Find team availability
        api_response = api_instance.team_availability(api_key, team_id, date_from=date_from, date_to=date_to, event_type_id=event_type_id)
        print("The response of AvailabilityApi->team_availability:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AvailabilityApi->team_availability: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **team_id** | **int**| ID of the team to fetch the availability for | 
 **date_from** | **date**| Start Date of the availability query | [optional] 
 **date_to** | **date**| End Date of the availability query | [optional] 
 **event_type_id** | **int**| Event Type ID of the event type to fetch the availability for | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | Team not found | Team has no members |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **user_availability**
> object user_availability(api_key, user_id=user_id, username=username, date_from=date_from, date_to=date_to, event_type_id=event_type_id)

Find user availability

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to http://localhost:3002/v1
# See configuration.py for a list of all supported configuration parameters.
configuration = openapi_client.Configuration(
    host = "http://localhost:3002/v1"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: ApiKeyAuth
configuration.api_key['ApiKeyAuth'] = os.environ["API_KEY"]

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['ApiKeyAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with openapi_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = openapi_client.AvailabilityApi(api_client)
    api_key = '1234abcd5678efgh' # str | Your API key
    user_id = 101 # int | ID of the user to fetch the availability for (optional)
    username = 'alice' # str | username of the user to fetch the availability for (optional)
    date_from = '2023-05-14 00:00:00' # date | Start Date of the availability query (optional)
    date_to = '2023-05-20 00:00:00' # date | End Date of the availability query (optional)
    event_type_id = 123 # int | Event Type ID of the event type to fetch the availability for (optional)

    try:
        # Find user availability
        api_response = api_instance.user_availability(api_key, user_id=user_id, username=username, date_from=date_from, date_to=date_to, event_type_id=event_type_id)
        print("The response of AvailabilityApi->user_availability:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling AvailabilityApi->user_availability: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **user_id** | **int**| ID of the user to fetch the availability for | [optional] 
 **username** | **str**| username of the user to fetch the availability for | [optional] 
 **date_from** | **date**| Start Date of the availability query | [optional] 
 **date_to** | **date**| End Date of the availability query | [optional] 
 **event_type_id** | **int**| Event Type ID of the event type to fetch the availability for | [optional] 

### Return type

**object**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | User not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

