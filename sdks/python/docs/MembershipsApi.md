# openapi_client.MembershipsApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**memberships_get**](MembershipsApi.md#memberships_get) | **GET** /memberships | Find all memberships
[**memberships_post**](MembershipsApi.md#memberships_post) | **POST** /memberships | Creates a new membership
[**memberships_user_id_team_id_delete**](MembershipsApi.md#memberships_user_id_team_id_delete) | **DELETE** /memberships/{userId}_{teamId} | Remove an existing membership
[**memberships_user_id_team_id_get**](MembershipsApi.md#memberships_user_id_team_id_get) | **GET** /memberships/{userId}_{teamId} | Find a membership by userID and teamID
[**memberships_user_id_team_id_patch**](MembershipsApi.md#memberships_user_id_team_id_patch) | **PATCH** /memberships/{userId}_{teamId} | Edit an existing membership


# **memberships_get**
> memberships_get()

Find all memberships

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
    api_instance = openapi_client.MembershipsApi(api_client)

    try:
        # Find all memberships
        api_instance.memberships_get()
    except Exception as e:
        print("Exception when calling MembershipsApi->memberships_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

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
**404** | No memberships were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **memberships_post**
> memberships_post()

Creates a new membership

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
    api_instance = openapi_client.MembershipsApi(api_client)

    try:
        # Creates a new membership
        api_instance.memberships_post()
    except Exception as e:
        print("Exception when calling MembershipsApi->memberships_post: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

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
**201** | OK, membership created |  -  |
**400** | Bad request. Membership body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **memberships_user_id_team_id_delete**
> memberships_user_id_team_id_delete(user_id, team_id)

Remove an existing membership

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
    api_instance = openapi_client.MembershipsApi(api_client)
    user_id = 56 # int | Numeric userId of the membership to get
    team_id = 56 # int | Numeric teamId of the membership to get

    try:
        # Remove an existing membership
        api_instance.memberships_user_id_team_id_delete(user_id, team_id)
    except Exception as e:
        print("Exception when calling MembershipsApi->memberships_user_id_team_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **int**| Numeric userId of the membership to get | 
 **team_id** | **int**| Numeric teamId of the membership to get | 

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
**201** | OK, membership removed successfuly |  -  |
**400** | Bad request. Membership id is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **memberships_user_id_team_id_get**
> memberships_user_id_team_id_get(user_id, team_id)

Find a membership by userID and teamID

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
    api_instance = openapi_client.MembershipsApi(api_client)
    user_id = 56 # int | Numeric userId of the membership to get
    team_id = 56 # int | Numeric teamId of the membership to get

    try:
        # Find a membership by userID and teamID
        api_instance.memberships_user_id_team_id_get(user_id, team_id)
    except Exception as e:
        print("Exception when calling MembershipsApi->memberships_user_id_team_id_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **int**| Numeric userId of the membership to get | 
 **team_id** | **int**| Numeric teamId of the membership to get | 

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
**404** | Membership was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **memberships_user_id_team_id_patch**
> memberships_user_id_team_id_patch(user_id, team_id)

Edit an existing membership

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
    api_instance = openapi_client.MembershipsApi(api_client)
    user_id = 56 # int | Numeric userId of the membership to get
    team_id = 56 # int | Numeric teamId of the membership to get

    try:
        # Edit an existing membership
        api_instance.memberships_user_id_team_id_patch(user_id, team_id)
    except Exception as e:
        print("Exception when calling MembershipsApi->memberships_user_id_team_id_patch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **user_id** | **int**| Numeric userId of the membership to get | 
 **team_id** | **int**| Numeric teamId of the membership to get | 

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
**201** | OK, membership edited successfully |  -  |
**400** | Bad request. Membership body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

