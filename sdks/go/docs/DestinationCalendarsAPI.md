# \DestinationCalendarsAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**DestinationCalendarsGet**](DestinationCalendarsAPI.md#DestinationCalendarsGet) | **Get** /destination-calendars | Find all destination calendars
[**DestinationCalendarsIdDelete**](DestinationCalendarsAPI.md#DestinationCalendarsIdDelete) | **Delete** /destination-calendars/{id} | Remove an existing destination calendar
[**DestinationCalendarsIdGet**](DestinationCalendarsAPI.md#DestinationCalendarsIdGet) | **Get** /destination-calendars/{id} | Find a destination calendar
[**DestinationCalendarsIdPatch**](DestinationCalendarsAPI.md#DestinationCalendarsIdPatch) | **Patch** /destination-calendars/{id} | Edit an existing destination calendar
[**DestinationCalendarsPost**](DestinationCalendarsAPI.md#DestinationCalendarsPost) | **Post** /destination-calendars | Creates a new destination calendar



## DestinationCalendarsGet

> DestinationCalendarsGet(ctx).ApiKey(apiKey).Execute()

Find all destination calendars

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.DestinationCalendarsAPI.DestinationCalendarsGet(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DestinationCalendarsAPI.DestinationCalendarsGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiDestinationCalendarsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## DestinationCalendarsIdDelete

> DestinationCalendarsIdDelete(ctx, id).ApiKey(apiKey).Execute()

Remove an existing destination calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    id := int32(56) // int32 | ID of the destination calendar to delete
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.DestinationCalendarsAPI.DestinationCalendarsIdDelete(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DestinationCalendarsAPI.DestinationCalendarsIdDelete``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the destination calendar to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiDestinationCalendarsIdDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## DestinationCalendarsIdGet

> DestinationCalendarsIdGet(ctx, id).ApiKey(apiKey).Execute()

Find a destination calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    id := int32(56) // int32 | ID of the destination calendar to get
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.DestinationCalendarsAPI.DestinationCalendarsIdGet(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DestinationCalendarsAPI.DestinationCalendarsIdGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the destination calendar to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiDestinationCalendarsIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## DestinationCalendarsIdPatch

> DestinationCalendarsIdPatch(ctx, id).ApiKey(apiKey).DestinationCalendarsIdPatchRequest(destinationCalendarsIdPatchRequest).Execute()

Edit an existing destination calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    id := int32(56) // int32 | ID of the destination calendar to edit
    apiKey := "apiKey_example" // string | Your API key
    destinationCalendarsIdPatchRequest := *openapiclient.NewDestinationCalendarsIdPatchRequest() // DestinationCalendarsIdPatchRequest | Create a new booking related to one of your event-types

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.DestinationCalendarsAPI.DestinationCalendarsIdPatch(context.Background(), id).ApiKey(apiKey).DestinationCalendarsIdPatchRequest(destinationCalendarsIdPatchRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DestinationCalendarsAPI.DestinationCalendarsIdPatch``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the destination calendar to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiDestinationCalendarsIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 
 **destinationCalendarsIdPatchRequest** | [**DestinationCalendarsIdPatchRequest**](DestinationCalendarsIdPatchRequest.md) | Create a new booking related to one of your event-types | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## DestinationCalendarsPost

> DestinationCalendarsPost(ctx).ApiKey(apiKey).DestinationCalendarsPostRequest(destinationCalendarsPostRequest).Execute()

Creates a new destination calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API key
    destinationCalendarsPostRequest := *openapiclient.NewDestinationCalendarsPostRequest("Integration_example", "ExternalId_example") // DestinationCalendarsPostRequest | Create a new destination calendar for your events

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.DestinationCalendarsAPI.DestinationCalendarsPost(context.Background()).ApiKey(apiKey).DestinationCalendarsPostRequest(destinationCalendarsPostRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DestinationCalendarsAPI.DestinationCalendarsPost``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiDestinationCalendarsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **destinationCalendarsPostRequest** | [**DestinationCalendarsPostRequest**](DestinationCalendarsPostRequest.md) | Create a new destination calendar for your events | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

