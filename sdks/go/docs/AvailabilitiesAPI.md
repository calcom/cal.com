# \AvailabilitiesAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddAvailability**](AvailabilitiesAPI.md#AddAvailability) | **Post** /availabilities | Creates a new availability
[**EditAvailabilityById**](AvailabilitiesAPI.md#EditAvailabilityById) | **Patch** /availabilities/{id} | Edit an existing availability
[**GetAvailabilityById**](AvailabilitiesAPI.md#GetAvailabilityById) | **Get** /availabilities/{id} | Find an availability
[**RemoveAvailabilityById**](AvailabilitiesAPI.md#RemoveAvailabilityById) | **Delete** /availabilities/{id} | Remove an existing availability



## AddAvailability

> AddAvailability(ctx).ApiKey(apiKey).AddAvailabilityRequest(addAvailabilityRequest).Execute()

Creates a new availability

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
    addAvailabilityRequest := *openapiclient.NewAddAvailabilityRequest(int32(123), "StartTime_example", "EndTime_example") // AddAvailabilityRequest | Edit an existing availability related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AvailabilitiesAPI.AddAvailability(context.Background()).ApiKey(apiKey).AddAvailabilityRequest(addAvailabilityRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilitiesAPI.AddAvailability``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddAvailabilityRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **addAvailabilityRequest** | [**AddAvailabilityRequest**](AddAvailabilityRequest.md) | Edit an existing availability related to one of your bookings | 

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


## EditAvailabilityById

> EditAvailabilityById(ctx, id).ApiKey(apiKey).EditAvailabilityByIdRequest(editAvailabilityByIdRequest).Execute()

Edit an existing availability

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
    apiKey := int32(56) // int32 | Your API key
    id := int32(56) // int32 | ID of the availability to edit
    editAvailabilityByIdRequest := *openapiclient.NewEditAvailabilityByIdRequest() // EditAvailabilityByIdRequest | Edit an existing availability related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AvailabilitiesAPI.EditAvailabilityById(context.Background(), id).ApiKey(apiKey).EditAvailabilityByIdRequest(editAvailabilityByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilitiesAPI.EditAvailabilityById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the availability to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditAvailabilityByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **int32** | Your API key | 

 **editAvailabilityByIdRequest** | [**EditAvailabilityByIdRequest**](EditAvailabilityByIdRequest.md) | Edit an existing availability related to one of your bookings | 

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


## GetAvailabilityById

> GetAvailabilityById(ctx, id).ApiKey(apiKey).Execute()

Find an availability

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
    id := int32(56) // int32 | ID of the availability to get
    apiKey := int32(56) // int32 | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AvailabilitiesAPI.GetAvailabilityById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilitiesAPI.GetAvailabilityById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the availability to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAvailabilityByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **int32** | Your API key | 

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


## RemoveAvailabilityById

> RemoveAvailabilityById(ctx, id).ApiKey(apiKey).Execute()

Remove an existing availability

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
    id := int32(56) // int32 | ID of the availability to delete
    apiKey := int32(56) // int32 | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AvailabilitiesAPI.RemoveAvailabilityById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilitiesAPI.RemoveAvailabilityById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the availability to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveAvailabilityByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **int32** | Your API key | 

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

