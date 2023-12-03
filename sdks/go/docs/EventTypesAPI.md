# \EventTypesAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddEventType**](EventTypesAPI.md#AddEventType) | **Post** /event-types | Creates a new event type
[**EditEventTypeById**](EventTypesAPI.md#EditEventTypeById) | **Patch** /event-types/{id} | Edit an existing eventType
[**GetEventTypeById**](EventTypesAPI.md#GetEventTypeById) | **Get** /event-types/{id} | Find a eventType
[**ListEventTypes**](EventTypesAPI.md#ListEventTypes) | **Get** /event-types | Find all event types
[**ListEventTypesByTeamId**](EventTypesAPI.md#ListEventTypesByTeamId) | **Get** /teams/{teamId}/event-types | Find all event types that belong to teamId
[**RemoveEventTypeById**](EventTypesAPI.md#RemoveEventTypeById) | **Delete** /event-types/{id} | Remove an existing eventType



## AddEventType

> AddEventType(ctx).ApiKey(apiKey).AddEventTypeRequest(addEventTypeRequest).Execute()

Creates a new event type

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
    apiKey := "apiKey_example" // string | Your API Key
    addEventTypeRequest := *openapiclient.NewAddEventTypeRequest(int32(123), map[string]interface{}(123), "Title_example", "Slug_example") // AddEventTypeRequest | Create a new event-type related to your user or team

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.AddEventType(context.Background()).ApiKey(apiKey).AddEventTypeRequest(addEventTypeRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.AddEventType``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddEventTypeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 
 **addEventTypeRequest** | [**AddEventTypeRequest**](AddEventTypeRequest.md) | Create a new event-type related to your user or team | 

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


## EditEventTypeById

> EditEventTypeById(ctx, id).ApiKey(apiKey).EditEventTypeByIdRequest(editEventTypeByIdRequest).Execute()

Edit an existing eventType

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
    apiKey := "apiKey_example" // string | Your API Key
    id := int32(56) // int32 | ID of the eventType to edit
    editEventTypeByIdRequest := *openapiclient.NewEditEventTypeByIdRequest() // EditEventTypeByIdRequest | Create a new event-type related to your user or team

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.EditEventTypeById(context.Background(), id).ApiKey(apiKey).EditEventTypeByIdRequest(editEventTypeByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.EditEventTypeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventType to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditEventTypeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 

 **editEventTypeByIdRequest** | [**EditEventTypeByIdRequest**](EditEventTypeByIdRequest.md) | Create a new event-type related to your user or team | 

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


## GetEventTypeById

> GetEventTypeById(ctx, id).ApiKey(apiKey).Execute()

Find a eventType

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
    apiKey := "apiKey_example" // string | Your API Key
    id := int32(4) // int32 | ID of the eventType to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.GetEventTypeById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.GetEventTypeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventType to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetEventTypeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 


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


## ListEventTypes

> ListEventTypes(ctx).ApiKey(apiKey).Execute()

Find all event types

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
    apiKey := "apiKey_example" // string | Your API Key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.ListEventTypes(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.ListEventTypes``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListEventTypesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 

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


## ListEventTypesByTeamId

> ListEventTypesByTeamId(ctx, teamId).ApiKey(apiKey).Execute()

Find all event types that belong to teamId

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
    apiKey := "apiKey_example" // string | Your API Key
    teamId := float32(8.14) // float32 | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.ListEventTypesByTeamId(context.Background(), teamId).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.ListEventTypesByTeamId``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**teamId** | **float32** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiListEventTypesByTeamIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 


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


## RemoveEventTypeById

> RemoveEventTypeById(ctx, id).ApiKey(apiKey).Execute()

Remove an existing eventType

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
    apiKey := "apiKey_example" // string | Your API Key
    id := int32(56) // int32 | ID of the eventType to delete

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.EventTypesAPI.RemoveEventTypeById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `EventTypesAPI.RemoveEventTypeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventType to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveEventTypeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 


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

