# openapi_client.SelectedCalendarsApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**edit_selected_calendar_by_id**](SelectedCalendarsApi.md#edit_selected_calendar_by_id) | **PATCH** /selected-calendars/{userId}_{integration}_{externalId} | Edit a selected calendar
[**get_selected_calendar_by_id**](SelectedCalendarsApi.md#get_selected_calendar_by_id) | **GET** /selected-calendars/{userId}_{integration}_{externalId} | Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by &#x60;_&#x60;
[**list_selected_calendars**](SelectedCalendarsApi.md#list_selected_calendars) | **GET** /selected-calendars | Find all selected calendars
[**remove_selected_calendar_by_id**](SelectedCalendarsApi.md#remove_selected_calendar_by_id) | **DELETE** /selected-calendars/{userId}_{integration}_{externalId} | Remove a selected calendar
[**selected_calendars_post**](SelectedCalendarsApi.md#selected_calendars_post) | **POST** /selected-calendars | Creates a new selected calendar


# **edit_selected_calendar_by_id**
> edit_selected_calendar_by_id(api_key, user_id, external_id, integration)

Edit a selected calendar

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
    api_instance = openapi_client.SelectedCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    user_id = 56 # int | userId of the selected calendar to get
    external_id = 'external_id_example' # str | externalId of the selected calendar to get
    integration = 'integration_example' # str | integration of the selected calendar to get

    try:
        # Edit a selected calendar
        api_instance.edit_selected_calendar_by_id(api_key, user_id, external_id, integration)
    except Exception as e:
        print("Exception when calling SelectedCalendarsApi->edit_selected_calendar_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **user_id** | **int**| userId of the selected calendar to get | 
 **external_id** | **str**| externalId of the selected calendar to get | 
 **integration** | **str**| integration of the selected calendar to get | 

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
**201** | OK, selected-calendar edited successfully |  -  |
**400** | Bad request. SelectedCalendar body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_selected_calendar_by_id**
> get_selected_calendar_by_id(api_key, user_id, external_id, integration)

Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_`

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
    api_instance = openapi_client.SelectedCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    user_id = 56 # int | userId of the selected calendar to get
    external_id = 'external_id_example' # str | externalId of the selected calendar to get
    integration = 'integration_example' # str | integration of the selected calendar to get

    try:
        # Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_`
        api_instance.get_selected_calendar_by_id(api_key, user_id, external_id, integration)
    except Exception as e:
        print("Exception when calling SelectedCalendarsApi->get_selected_calendar_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **user_id** | **int**| userId of the selected calendar to get | 
 **external_id** | **str**| externalId of the selected calendar to get | 
 **integration** | **str**| integration of the selected calendar to get | 

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
**404** | SelectedCalendar was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_selected_calendars**
> list_selected_calendars(api_key)

Find all selected calendars

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
    api_instance = openapi_client.SelectedCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API Key

    try:
        # Find all selected calendars
        api_instance.list_selected_calendars(api_key)
    except Exception as e:
        print("Exception when calling SelectedCalendarsApi->list_selected_calendars: %s\n" % e)
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
**404** | No selected calendars were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **remove_selected_calendar_by_id**
> remove_selected_calendar_by_id(api_key, user_id, external_id, integration)

Remove a selected calendar

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
    api_instance = openapi_client.SelectedCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    user_id = 56 # int | userId of the selected calendar to get
    external_id = 56 # int | externalId of the selected-calendar to get
    integration = 'integration_example' # str | integration of the selected calendar to get

    try:
        # Remove a selected calendar
        api_instance.remove_selected_calendar_by_id(api_key, user_id, external_id, integration)
    except Exception as e:
        print("Exception when calling SelectedCalendarsApi->remove_selected_calendar_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **user_id** | **int**| userId of the selected calendar to get | 
 **external_id** | **int**| externalId of the selected-calendar to get | 
 **integration** | **str**| integration of the selected calendar to get | 

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
**201** | OK, selected-calendar removed successfully |  -  |
**400** | Bad request. SelectedCalendar id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **selected_calendars_post**
> selected_calendars_post(api_key, selected_calendars_post_request)

Creates a new selected calendar

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.selected_calendars_post_request import SelectedCalendarsPostRequest
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
    api_instance = openapi_client.SelectedCalendarsApi(api_client)
    api_key = 'api_key_example' # str | Your API Key
    selected_calendars_post_request = openapi_client.SelectedCalendarsPostRequest() # SelectedCalendarsPostRequest | Create a new selected calendar

    try:
        # Creates a new selected calendar
        api_instance.selected_calendars_post(api_key, selected_calendars_post_request)
    except Exception as e:
        print("Exception when calling SelectedCalendarsApi->selected_calendars_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API Key | 
 **selected_calendars_post_request** | [**SelectedCalendarsPostRequest**](SelectedCalendarsPostRequest.md)| Create a new selected calendar | 

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
**201** | OK, selected calendar created |  -  |
**400** | Bad request. SelectedCalendar body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

