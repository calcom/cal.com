# openapi_client.AvailabilitiesApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**add_availability**](AvailabilitiesApi.md#add_availability) | **POST** /availabilities | Creates a new availability
[**edit_availability_by_id**](AvailabilitiesApi.md#edit_availability_by_id) | **PATCH** /availabilities/{id} | Edit an existing availability
[**get_availability_by_id**](AvailabilitiesApi.md#get_availability_by_id) | **GET** /availabilities/{id} | Find an availability
[**remove_availability_by_id**](AvailabilitiesApi.md#remove_availability_by_id) | **DELETE** /availabilities/{id} | Remove an existing availability


# **add_availability**
> add_availability(api_key, add_availability_request)

Creates a new availability

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.add_availability_request import AddAvailabilityRequest
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
    api_instance = openapi_client.AvailabilitiesApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    add_availability_request = {"scheduleId":123,"days":[1,2,3,5],"startTime":"1970-01-01T17:00:00.000Z","endTime":"1970-01-01T17:00:00.000Z"} # AddAvailabilityRequest | Edit an existing availability related to one of your bookings

    try:
        # Creates a new availability
        api_instance.add_availability(api_key, add_availability_request)
    except Exception as e:
        print("Exception when calling AvailabilitiesApi->add_availability: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **add_availability_request** | [**AddAvailabilityRequest**](AddAvailabilityRequest.md)| Edit an existing availability related to one of your bookings | 

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
**201** | OK, availability created |  -  |
**400** | Bad request. Availability body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **edit_availability_by_id**
> edit_availability_by_id(api_key, id, edit_availability_by_id_request)

Edit an existing availability

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.edit_availability_by_id_request import EditAvailabilityByIdRequest
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
    api_instance = openapi_client.AvailabilitiesApi(api_client)
    api_key = 56 # int | Your API key
    id = 56 # int | ID of the availability to edit
    edit_availability_by_id_request = {"scheduleId":123,"days":[1,2,3,5],"startTime":"1970-01-01T17:00:00.000Z","endTime":"1970-01-01T17:00:00.000Z"} # EditAvailabilityByIdRequest | Edit an existing availability related to one of your bookings

    try:
        # Edit an existing availability
        api_instance.edit_availability_by_id(api_key, id, edit_availability_by_id_request)
    except Exception as e:
        print("Exception when calling AvailabilitiesApi->edit_availability_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **int**| Your API key | 
 **id** | **int**| ID of the availability to edit | 
 **edit_availability_by_id_request** | [**EditAvailabilityByIdRequest**](EditAvailabilityByIdRequest.md)| Edit an existing availability related to one of your bookings | 

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
**201** | OK, availability edited successfully |  -  |
**400** | Bad request. Availability body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_availability_by_id**
> get_availability_by_id(id, api_key)

Find an availability

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
    api_instance = openapi_client.AvailabilitiesApi(api_client)
    id = 56 # int | ID of the availability to get
    api_key = 56 # int | Your API key

    try:
        # Find an availability
        api_instance.get_availability_by_id(id, api_key)
    except Exception as e:
        print("Exception when calling AvailabilitiesApi->get_availability_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the availability to get | 
 **api_key** | **int**| Your API key | 

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
**401** | Authorization information is missing or invalid |  -  |
**404** | Availability not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **remove_availability_by_id**
> remove_availability_by_id(id, api_key)

Remove an existing availability

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
    api_instance = openapi_client.AvailabilitiesApi(api_client)
    id = 56 # int | ID of the availability to delete
    api_key = 56 # int | Your API key

    try:
        # Remove an existing availability
        api_instance.remove_availability_by_id(id, api_key)
    except Exception as e:
        print("Exception when calling AvailabilitiesApi->remove_availability_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the availability to delete | 
 **api_key** | **int**| Your API key | 

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
**201** | OK, availability removed successfully |  -  |
**400** | Bad request. Availability id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

