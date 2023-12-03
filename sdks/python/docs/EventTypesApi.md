# openapi_client.EventTypesApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**add_event_type**](EventTypesApi.md#add_event_type) | **POST** /event-types | Creates a new event type
[**edit_event_type_by_id**](EventTypesApi.md#edit_event_type_by_id) | **PATCH** /event-types/{id} | Edit an existing eventType
[**get_event_type_by_id**](EventTypesApi.md#get_event_type_by_id) | **GET** /event-types/{id} | Find a eventType
[**list_event_types**](EventTypesApi.md#list_event_types) | **GET** /event-types | Find all event types
[**list_event_types_by_team_id**](EventTypesApi.md#list_event_types_by_team_id) | **GET** /teams/{teamId}/event-types | Find all event types that belong to teamId
[**remove_event_type_by_id**](EventTypesApi.md#remove_event_type_by_id) | **DELETE** /event-types/{id} | Remove an existing eventType


# **add_event_type**
> add_event_type(api_key, add_event_type_request)

Creates a new event type

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.add_event_type_request import AddEventTypeRequest
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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    add_event_type_request = {"title":"Hello World","slug":"hello-world","length":30,"hidden":false,"position":0,"eventName":null,"timeZone":null,"scheduleId":5,"periodType":"UNLIMITED","periodStartDate":"2023-02-15T08:46:16.000Z","periodEndDate":"2023-0-15T08:46:16.000Z","periodDays":null,"periodCountCalendarDays":false,"requiresConfirmation":false,"recurringEvent":null,"disableGuests":false,"hideCalendarNotes":false,"minimumBookingNotice":120,"beforeEventBuffer":0,"afterEventBuffer":0,"price":0,"currency":"usd","slotInterval":null,"successRedirectUrl":null,"description":"A test event type","metadata":{"apps":{"stripe":{"price":0,"enabled":false,"currency":"usd"}}}} # AddEventTypeRequest | Create a new event-type related to your user or team

    try:
        # Creates a new event type
        api_instance.add_event_type(api_key, add_event_type_request)
    except Exception as e:
        print("Exception when calling EventTypesApi->add_event_type: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **add_event_type_request** | [**AddEventTypeRequest**](AddEventTypeRequest.md)| Create a new event-type related to your user or team | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | OK, event type created |  -  |
**400** | Bad request. EventType body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **edit_event_type_by_id**
> edit_event_type_by_id(api_key, id, edit_event_type_by_id_request)

Edit an existing eventType

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.edit_event_type_by_id_request import EditEventTypeByIdRequest
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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    id = 56 # int | ID of the eventType to edit
    edit_event_type_by_id_request = {"event-type":{"summary":"An example of event type PATCH request","value":{"length":60,"requiresConfirmation":true}}} # EditEventTypeByIdRequest | Create a new event-type related to your user or team

    try:
        # Edit an existing eventType
        api_instance.edit_event_type_by_id(api_key, id, edit_event_type_by_id_request)
    except Exception as e:
        print("Exception when calling EventTypesApi->edit_event_type_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **id** | **int**| ID of the eventType to edit | 
 **edit_event_type_by_id_request** | [**EditEventTypeByIdRequest**](EditEventTypeByIdRequest.md)| Create a new event-type related to your user or team | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | OK, eventType edited successfully |  -  |
**400** | Bad request. EventType body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_event_type_by_id**
> get_event_type_by_id(api_key, id)

Find a eventType

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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    id = 4 # int | ID of the eventType to get

    try:
        # Find a eventType
        api_instance.get_event_type_by_id(api_key, id)
    except Exception as e:
        print("Exception when calling EventTypesApi->get_event_type_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **id** | **int**| ID of the eventType to get | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | EventType was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_event_types**
> list_event_types(api_key)

Find all event types

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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key

    try:
        # Find all event types
        api_instance.list_event_types(api_key)
    except Exception as e:
        print("Exception when calling EventTypesApi->list_event_types: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | No event types were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_event_types_by_team_id**
> list_event_types_by_team_id(api_key, team_id)

Find all event types that belong to teamId

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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    team_id = 3.4 # float | 

    try:
        # Find all event types that belong to teamId
        api_instance.list_event_types_by_team_id(api_key, team_id)
    except Exception as e:
        print("Exception when calling EventTypesApi->list_event_types_by_team_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **team_id** | **float**|  | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | No event types were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **remove_event_type_by_id**
> remove_event_type_by_id(api_key, id)

Remove an existing eventType

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
    api_instance = openapi_client.EventTypesApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    id = 56 # int | ID of the eventType to delete

    try:
        # Remove an existing eventType
        api_instance.remove_event_type_by_id(api_key, id)
    except Exception as e:
        print("Exception when calling EventTypesApi->remove_event_type_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **id** | **int**| ID of the eventType to delete | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | OK, eventType removed successfully |  -  |
**400** | Bad request. EventType id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

