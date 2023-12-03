# openapi_client.CustomInputsApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**custom_inputs_get**](CustomInputsApi.md#custom_inputs_get) | **GET** /custom-inputs | Find all eventTypeCustomInputs
[**custom_inputs_id_delete**](CustomInputsApi.md#custom_inputs_id_delete) | **DELETE** /custom-inputs/{id} | Remove an existing eventTypeCustomInput
[**custom_inputs_id_get**](CustomInputsApi.md#custom_inputs_id_get) | **GET** /custom-inputs/{id} | Find a eventTypeCustomInput
[**custom_inputs_id_patch**](CustomInputsApi.md#custom_inputs_id_patch) | **PATCH** /custom-inputs/{id} | Edit an existing eventTypeCustomInput
[**custom_inputs_post**](CustomInputsApi.md#custom_inputs_post) | **POST** /custom-inputs | Creates a new eventTypeCustomInput


# **custom_inputs_get**
> custom_inputs_get(api_key)

Find all eventTypeCustomInputs

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
    api_instance = openapi_client.CustomInputsApi(api_client)
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find all eventTypeCustomInputs
        api_instance.custom_inputs_get(api_key)
    except Exception as e:
        print("Exception when calling CustomInputsApi->custom_inputs_get: %s\n" % e)
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
**404** | No eventTypeCustomInputs were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **custom_inputs_id_delete**
> custom_inputs_id_delete(id, api_key)

Remove an existing eventTypeCustomInput

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
    api_instance = openapi_client.CustomInputsApi(api_client)
    id = 56 # int | ID of the eventTypeCustomInput to delete
    api_key = 'api_key_example' # str | Your API key

    try:
        # Remove an existing eventTypeCustomInput
        api_instance.custom_inputs_id_delete(id, api_key)
    except Exception as e:
        print("Exception when calling CustomInputsApi->custom_inputs_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the eventTypeCustomInput to delete | 
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
**201** | OK, eventTypeCustomInput removed successfully |  -  |
**400** | Bad request. EventType id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **custom_inputs_id_get**
> custom_inputs_id_get(id, api_key)

Find a eventTypeCustomInput

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
    api_instance = openapi_client.CustomInputsApi(api_client)
    id = 56 # int | ID of the eventTypeCustomInput to get
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find a eventTypeCustomInput
        api_instance.custom_inputs_id_get(id, api_key)
    except Exception as e:
        print("Exception when calling CustomInputsApi->custom_inputs_id_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the eventTypeCustomInput to get | 
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
**404** | EventType was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **custom_inputs_id_patch**
> custom_inputs_id_patch(id, api_key, custom_inputs_id_patch_request)

Edit an existing eventTypeCustomInput

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.custom_inputs_id_patch_request import CustomInputsIdPatchRequest
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
    api_instance = openapi_client.CustomInputsApi(api_client)
    id = 56 # int | ID of the eventTypeCustomInput to edit
    api_key = 'api_key_example' # str | Your API key
    custom_inputs_id_patch_request = {"required":true} # CustomInputsIdPatchRequest | Edit an existing eventTypeCustomInput for an event type

    try:
        # Edit an existing eventTypeCustomInput
        api_instance.custom_inputs_id_patch(id, api_key, custom_inputs_id_patch_request)
    except Exception as e:
        print("Exception when calling CustomInputsApi->custom_inputs_id_patch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the eventTypeCustomInput to edit | 
 **api_key** | **str**| Your API key | 
 **custom_inputs_id_patch_request** | [**CustomInputsIdPatchRequest**](CustomInputsIdPatchRequest.md)| Edit an existing eventTypeCustomInput for an event type | 

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
**201** | OK, eventTypeCustomInput edited successfully |  -  |
**400** | Bad request. EventType body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **custom_inputs_post**
> custom_inputs_post(api_key, custom_inputs_post_request)

Creates a new eventTypeCustomInput

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.custom_inputs_post_request import CustomInputsPostRequest
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
    api_instance = openapi_client.CustomInputsApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    custom_inputs_post_request = {"eventTypeID":1,"label":"Phone Number","type":"PHONE","required":true,"placeholder":"100 101 1234"} # CustomInputsPostRequest | Create a new custom input for an event type

    try:
        # Creates a new eventTypeCustomInput
        api_instance.custom_inputs_post(api_key, custom_inputs_post_request)
    except Exception as e:
        print("Exception when calling CustomInputsApi->custom_inputs_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **custom_inputs_post_request** | [**CustomInputsPostRequest**](CustomInputsPostRequest.md)| Create a new custom input for an event type | 

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
**201** | OK, eventTypeCustomInput created |  -  |
**400** | Bad request. EventTypeCustomInput body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

