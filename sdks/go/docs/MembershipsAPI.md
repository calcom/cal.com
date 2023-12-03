# \MembershipsAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**MembershipsGet**](MembershipsAPI.md#MembershipsGet) | **Get** /memberships | Find all memberships
[**MembershipsPost**](MembershipsAPI.md#MembershipsPost) | **Post** /memberships | Creates a new membership
[**MembershipsUserIdTeamIdDelete**](MembershipsAPI.md#MembershipsUserIdTeamIdDelete) | **Delete** /memberships/{userId}_{teamId} | Remove an existing membership
[**MembershipsUserIdTeamIdGet**](MembershipsAPI.md#MembershipsUserIdTeamIdGet) | **Get** /memberships/{userId}_{teamId} | Find a membership by userID and teamID
[**MembershipsUserIdTeamIdPatch**](MembershipsAPI.md#MembershipsUserIdTeamIdPatch) | **Patch** /memberships/{userId}_{teamId} | Edit an existing membership



## MembershipsGet

> MembershipsGet(ctx).Execute()

Find all memberships

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.MembershipsAPI.MembershipsGet(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `MembershipsAPI.MembershipsGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiMembershipsGetRequest struct via the builder pattern


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


## MembershipsPost

> MembershipsPost(ctx).Execute()

Creates a new membership

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.MembershipsAPI.MembershipsPost(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `MembershipsAPI.MembershipsPost``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiMembershipsPostRequest struct via the builder pattern


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


## MembershipsUserIdTeamIdDelete

> MembershipsUserIdTeamIdDelete(ctx, userId, teamId).Execute()

Remove an existing membership

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
    userId := int32(56) // int32 | Numeric userId of the membership to get
    teamId := int32(56) // int32 | Numeric teamId of the membership to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.MembershipsAPI.MembershipsUserIdTeamIdDelete(context.Background(), userId, teamId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `MembershipsAPI.MembershipsUserIdTeamIdDelete``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | Numeric userId of the membership to get | 
**teamId** | **int32** | Numeric teamId of the membership to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiMembershipsUserIdTeamIdDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



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


## MembershipsUserIdTeamIdGet

> MembershipsUserIdTeamIdGet(ctx, userId, teamId).Execute()

Find a membership by userID and teamID

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
    userId := int32(56) // int32 | Numeric userId of the membership to get
    teamId := int32(56) // int32 | Numeric teamId of the membership to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.MembershipsAPI.MembershipsUserIdTeamIdGet(context.Background(), userId, teamId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `MembershipsAPI.MembershipsUserIdTeamIdGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | Numeric userId of the membership to get | 
**teamId** | **int32** | Numeric teamId of the membership to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiMembershipsUserIdTeamIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



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


## MembershipsUserIdTeamIdPatch

> MembershipsUserIdTeamIdPatch(ctx, userId, teamId).Execute()

Edit an existing membership

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
    userId := int32(56) // int32 | Numeric userId of the membership to get
    teamId := int32(56) // int32 | Numeric teamId of the membership to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.MembershipsAPI.MembershipsUserIdTeamIdPatch(context.Background(), userId, teamId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `MembershipsAPI.MembershipsUserIdTeamIdPatch``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | Numeric userId of the membership to get | 
**teamId** | **int32** | Numeric teamId of the membership to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiMembershipsUserIdTeamIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



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

