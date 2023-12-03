# openapi_client.WebhooksApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**add_webhook**](WebhooksApi.md#add_webhook) | **POST** /webhooks | Creates a new webhook
[**edit_webhook_by_id**](WebhooksApi.md#edit_webhook_by_id) | **PATCH** /webhooks/{id} | Edit an existing webhook
[**get_webhook_by_id**](WebhooksApi.md#get_webhook_by_id) | **GET** /webhooks/{id} | Find a webhook
[**list_webhooks**](WebhooksApi.md#list_webhooks) | **GET** /webhooks | Find all webhooks
[**remove_webhook_by_id**](WebhooksApi.md#remove_webhook_by_id) | **DELETE** /webhooks/{id} | Remove an existing hook


# **add_webhook**
> add_webhook(api_key, add_webhook_request)

Creates a new webhook

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.add_webhook_request import AddWebhookRequest
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
    api_instance = openapi_client.WebhooksApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    add_webhook_request = openapi_client.AddWebhookRequest() # AddWebhookRequest | Create a new webhook

    try:
        # Creates a new webhook
        api_instance.add_webhook(api_key, add_webhook_request)
    except Exception as e:
        print("Exception when calling WebhooksApi->add_webhook: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **add_webhook_request** | [**AddWebhookRequest**](AddWebhookRequest.md)| Create a new webhook | 

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
**201** | OK, webhook created |  -  |
**400** | Bad request. webhook body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **edit_webhook_by_id**
> edit_webhook_by_id(id, api_key, edit_webhook_by_id_request)

Edit an existing webhook

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.edit_webhook_by_id_request import EditWebhookByIdRequest
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
    api_instance = openapi_client.WebhooksApi(api_client)
    id = 56 # int | Numeric ID of the webhook to edit
    api_key = 'api_key_example' # str | Your API key
    edit_webhook_by_id_request = openapi_client.EditWebhookByIdRequest() # EditWebhookByIdRequest | Edit an existing webhook

    try:
        # Edit an existing webhook
        api_instance.edit_webhook_by_id(id, api_key, edit_webhook_by_id_request)
    except Exception as e:
        print("Exception when calling WebhooksApi->edit_webhook_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| Numeric ID of the webhook to edit | 
 **api_key** | **str**| Your API key | 
 **edit_webhook_by_id_request** | [**EditWebhookByIdRequest**](EditWebhookByIdRequest.md)| Edit an existing webhook | 

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
**201** | OK, webhook edited successfully |  -  |
**400** | Bad request. Webhook body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_webhook_by_id**
> get_webhook_by_id(id, api_key)

Find a webhook

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
    api_instance = openapi_client.WebhooksApi(api_client)
    id = 56 # int | Numeric ID of the webhook to get
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find a webhook
        api_instance.get_webhook_by_id(id, api_key)
    except Exception as e:
        print("Exception when calling WebhooksApi->get_webhook_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| Numeric ID of the webhook to get | 
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
**404** | Webhook was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_webhooks**
> list_webhooks(api_key)

Find all webhooks

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
    api_instance = openapi_client.WebhooksApi(api_client)
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find all webhooks
        api_instance.list_webhooks(api_key)
    except Exception as e:
        print("Exception when calling WebhooksApi->list_webhooks: %s\n" % e)
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
**404** | No webhooks were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **remove_webhook_by_id**
> remove_webhook_by_id(id, api_key)

Remove an existing hook

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
    api_instance = openapi_client.WebhooksApi(api_client)
    id = 56 # int | Numeric ID of the hooks to delete
    api_key = 'api_key_example' # str | Your API key

    try:
        # Remove an existing hook
        api_instance.remove_webhook_by_id(id, api_key)
    except Exception as e:
        print("Exception when calling WebhooksApi->remove_webhook_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| Numeric ID of the hooks to delete | 
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
**201** | OK, hook removed successfully |  -  |
**400** | Bad request. hook id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

