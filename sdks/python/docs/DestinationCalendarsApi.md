# openapi_client.DestinationCalendarsApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**destination_calendars_get**](DestinationCalendarsApi.md#destination_calendars_get) | **GET** /destination-calendars | Find all destination calendars
[**destination_calendars_id_delete**](DestinationCalendarsApi.md#destination_calendars_id_delete) | **DELETE** /destination-calendars/{id} | Remove an existing destination calendar
[**destination_calendars_id_get**](DestinationCalendarsApi.md#destination_calendars_id_get) | **GET** /destination-calendars/{id} | Find a destination calendar
[**destination_calendars_id_patch**](DestinationCalendarsApi.md#destination_calendars_id_patch) | **PATCH** /destination-calendars/{id} | Edit an existing destination calendar
[**destination_calendars_post**](DestinationCalendarsApi.md#destination_calendars_post) | **POST** /destination-calendars | Creates a new destination calendar


# **destination_calendars_get**
> destination_calendars_get(api_key)

Find all destination calendars

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
    api_instance = openapi_client.DestinationCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find all destination calendars
        api_instance.destination_calendars_get(api_key)
    except Exception as e:
        print("Exception when calling DestinationCalendarsApi->destination_calendars_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 

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
**404** | No destination calendars were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **destination_calendars_id_delete**
> destination_calendars_id_delete(id, api_key)

Remove an existing destination calendar

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
    api_instance = openapi_client.DestinationCalendarsApi(api_client)
    id = 56 # int | ID of the destination calendar to delete
    api_key = 'api_key_example' # str | Your API key

    try:
        # Remove an existing destination calendar
        api_instance.destination_calendars_id_delete(id, api_key)
    except Exception as e:
        print("Exception when calling DestinationCalendarsApi->destination_calendars_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the destination calendar to delete | 
 **api_key** | **str**| Your API key | 

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
**200** | OK, destinationCalendar removed successfully |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | Destination calendar not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **destination_calendars_id_get**
> destination_calendars_id_get(id, api_key)

Find a destination calendar

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
    api_instance = openapi_client.DestinationCalendarsApi(api_client)
    id = 56 # int | ID of the destination calendar to get
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find a destination calendar
        api_instance.destination_calendars_id_get(id, api_key)
    except Exception as e:
        print("Exception when calling DestinationCalendarsApi->destination_calendars_id_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the destination calendar to get | 
 **api_key** | **str**| Your API key | 

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
**404** | Destination calendar not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **destination_calendars_id_patch**
> destination_calendars_id_patch(id, api_key, destination_calendars_id_patch_request)

Edit an existing destination calendar

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.destination_calendars_id_patch_request import DestinationCalendarsIdPatchRequest
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
    api_instance = openapi_client.DestinationCalendarsApi(api_client)
    id = 56 # int | ID of the destination calendar to edit
    api_key = 'api_key_example' # str | Your API key
    destination_calendars_id_patch_request = openapi_client.DestinationCalendarsIdPatchRequest() # DestinationCalendarsIdPatchRequest | Create a new booking related to one of your event-types

    try:
        # Edit an existing destination calendar
        api_instance.destination_calendars_id_patch(id, api_key, destination_calendars_id_patch_request)
    except Exception as e:
        print("Exception when calling DestinationCalendarsApi->destination_calendars_id_patch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the destination calendar to edit | 
 **api_key** | **str**| Your API key | 
 **destination_calendars_id_patch_request** | [**DestinationCalendarsIdPatchRequest**](DestinationCalendarsIdPatchRequest.md)| Create a new booking related to one of your event-types | 

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
**200** | OK |  -  |
**401** | Authorization information is missing or invalid. |  -  |
**404** | Destination calendar not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **destination_calendars_post**
> destination_calendars_post(api_key, destination_calendars_post_request)

Creates a new destination calendar

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.destination_calendars_post_request import DestinationCalendarsPostRequest
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
    api_instance = openapi_client.DestinationCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    destination_calendars_post_request = openapi_client.DestinationCalendarsPostRequest() # DestinationCalendarsPostRequest | Create a new destination calendar for your events

    try:
        # Creates a new destination calendar
        api_instance.destination_calendars_post(api_key, destination_calendars_post_request)
    except Exception as e:
        print("Exception when calling DestinationCalendarsApi->destination_calendars_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **destination_calendars_post_request** | [**DestinationCalendarsPostRequest**](DestinationCalendarsPostRequest.md)| Create a new destination calendar for your events | 

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
**201** | OK, destination calendar created |  -  |
**400** | Bad request. DestinationCalendar body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

