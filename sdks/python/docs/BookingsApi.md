# openapi_client.BookingsApi

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**add_booking**](BookingsApi.md#add_booking) | **POST** /bookings | Creates a new booking
[**cancel_booking_by_id**](BookingsApi.md#cancel_booking_by_id) | **DELETE** /bookings/{id}/cancel | Booking cancellation
[**edit_booking_by_id**](BookingsApi.md#edit_booking_by_id) | **PATCH** /bookings/{id} | Edit an existing booking
[**get_booking_by_id**](BookingsApi.md#get_booking_by_id) | **GET** /bookings/{id} | Find a booking
[**list_bookings**](BookingsApi.md#list_bookings) | **GET** /bookings | Find all bookings


# **add_booking**
> add_booking(api_key, add_booking_request)

Creates a new booking

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.add_booking_request import AddBookingRequest
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
    api_instance = openapi_client.BookingsApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    add_booking_request = {"eventTypeId":2323232,"start":"2023-05-24T13:00:00.000Z","end":"2023-05-24T13:30:00.000Z","responses":{"name":"Hello Hello","email":"hello@gmail.com","metadata":{},"location":"Calcom HQ"},"timeZone":"Europe/London","language":"en","title":"Debugging between Syed Ali Shahbaz and Hello Hello","description":null,"status":"PENDING","smsReminderNumber":null} # AddBookingRequest | Create a new booking related to one of your event-types

    try:
        # Creates a new booking
        api_instance.add_booking(api_key, add_booking_request)
    except Exception as e:
        print("Exception when calling BookingsApi->add_booking: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **add_booking_request** | [**AddBookingRequest**](AddBookingRequest.md)| Create a new booking related to one of your event-types | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Booking(s) created successfully. |  -  |
**400** | Bad request &lt;table&gt;   &lt;tr&gt;     &lt;td&gt;Message&lt;/td&gt;     &lt;td&gt;Cause&lt;/td&gt;   &lt;/tr&gt;   &lt;tr&gt;     &lt;td&gt;Booking body is invalid&lt;/td&gt;     &lt;td&gt;Missing property on booking entity.&lt;/td&gt;   &lt;/tr&gt;   &lt;tr&gt;     &lt;td&gt;Invalid eventTypeId&lt;/td&gt;     &lt;td&gt;The provided eventTypeId does not exist.&lt;/td&gt;   &lt;/tr&gt;   &lt;tr&gt;     &lt;td&gt;Missing recurringCount&lt;/td&gt;     &lt;td&gt;The eventType is recurring, and no recurringCount was passed.&lt;/td&gt;   &lt;/tr&gt;   &lt;tr&gt;     &lt;td&gt;Invalid recurringCount&lt;/td&gt;     &lt;td&gt;The provided recurringCount is greater than the eventType recurring config&lt;/td&gt;   &lt;/tr&gt; &lt;/table&gt;  |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancel_booking_by_id**
> cancel_booking_by_id(id, api_key, all_remaining_bookings=all_remaining_bookings, reason=reason)

Booking cancellation

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
    api_instance = openapi_client.BookingsApi(api_client)
    id = 56 # int | ID of the booking to cancel
    api_key = 'api_key_example' # str | Your API key
    all_remaining_bookings = True # bool | Delete all remaining bookings (optional)
    reason = 'reason_example' # str | The reason for cancellation of the booking (optional)

    try:
        # Booking cancellation
        api_instance.cancel_booking_by_id(id, api_key, all_remaining_bookings=all_remaining_bookings, reason=reason)
    except Exception as e:
        print("Exception when calling BookingsApi->cancel_booking_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the booking to cancel | 
 **api_key** | **str**| Your API key | 
 **all_remaining_bookings** | **bool**| Delete all remaining bookings | [optional] 
 **reason** | **str**| The reason for cancellation of the booking | [optional] 

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
**200** | OK, booking cancelled successfully |  -  |
**400** | Bad request  &lt;table&gt;    &lt;tr&gt;      &lt;td&gt;Message&lt;/td&gt;      &lt;td&gt;Cause&lt;/td&gt;    &lt;/tr&gt;    &lt;tr&gt;      &lt;td&gt;Booking not found&lt;/td&gt;      &lt;td&gt;The provided id didn&#39;t correspond to any existing booking.&lt;/td&gt;    &lt;/tr&gt;    &lt;tr&gt;      &lt;td&gt;User not found&lt;/td&gt;      &lt;td&gt;The userId did not matched an existing user.&lt;/td&gt;    &lt;/tr&gt;  &lt;/table&gt;  |  -  |
**404** | User not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **edit_booking_by_id**
> edit_booking_by_id(api_key, id, edit_booking_by_id_request)

Edit an existing booking

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.edit_booking_by_id_request import EditBookingByIdRequest
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
    api_instance = openapi_client.BookingsApi(api_client)
    api_key = 'api_key_example' # str | Your API key
    id = 56 # int | ID of the booking to edit
    edit_booking_by_id_request = {"title":"Debugging between Syed Ali Shahbaz and Hello Hello","start":"2023-05-24T13:00:00.000Z","end":"2023-05-24T13:30:00.000Z","status":"CANCELLED"} # EditBookingByIdRequest | Edit an existing booking related to one of your event-types

    try:
        # Edit an existing booking
        api_instance.edit_booking_by_id(api_key, id, edit_booking_by_id_request)
    except Exception as e:
        print("Exception when calling BookingsApi->edit_booking_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **id** | **int**| ID of the booking to edit | 
 **edit_booking_by_id_request** | [**EditBookingByIdRequest**](EditBookingByIdRequest.md)| Edit an existing booking related to one of your event-types | 

### Return type

void (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | OK, booking edited successfully |  -  |
**400** | Bad request. Booking body is invalid. |  -  |
**401** | Authorization information is missing or invalid. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **get_booking_by_id**
> Booking get_booking_by_id(id, api_key)

Find a booking

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.booking import Booking
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
    api_instance = openapi_client.BookingsApi(api_client)
    id = 56 # int | ID of the booking to get
    api_key = 'api_key_example' # str | Your API key

    try:
        # Find a booking
        api_response = api_instance.get_booking_by_id(id, api_key)
        print("The response of BookingsApi->get_booking_by_id:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BookingsApi->get_booking_by_id: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| ID of the booking to get | 
 **api_key** | **str**| Your API key | 

### Return type

[**Booking**](Booking.md)

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
**404** | Booking was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **list_bookings**
> List[Booking] list_bookings(api_key, user_id=user_id, attendee_email=attendee_email)

Find all bookings

### Example

* Api Key Authentication (ApiKeyAuth):

```python
import time
import os
import openapi_client
from openapi_client.models.booking import Booking
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
    api_instance = openapi_client.BookingsApi(api_client)
    api_key = '123456789abcdefgh' # str | Your API key
    user_id = openapi_client.ListBookingsUserIdParameter() # ListBookingsUserIdParameter |  (optional)
    attendee_email = openapi_client.ListBookingsAttendeeEmailParameter() # ListBookingsAttendeeEmailParameter |  (optional)

    try:
        # Find all bookings
        api_response = api_instance.list_bookings(api_key, user_id=user_id, attendee_email=attendee_email)
        print("The response of BookingsApi->list_bookings:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling BookingsApi->list_bookings: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **api_key** | **str**| Your API key | 
 **user_id** | [**ListBookingsUserIdParameter**](.md)|  | [optional] 
 **attendee_email** | [**ListBookingsAttendeeEmailParameter**](.md)|  | [optional] 

### Return type

[**List[Booking]**](Booking.md)

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
**404** | No bookings were found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

