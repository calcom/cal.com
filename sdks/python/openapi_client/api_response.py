"""API response object."""

from __future__ import annotations
from typing import Any, Dict, Optional, Generic, TypeVar
from pydantic import Field, StrictInt, StrictStr, StrictBytes, BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """
    API response object
    """

    status_code: StrictInt = Field(description="HTTP status code")
    headers: Optional[Dict[StrictStr, StrictStr]] = Field(None, description="HTTP headers")
    data: T = Field(description="Deserialized data given the data type")
    raw_data: StrictBytes = Field(description="Raw data (HTTP response body)")

    model_config = {
        "arbitrary_types_allowed": True
    }
