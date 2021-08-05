import merge from "lodash.merge";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const _get = async (url, params, { headers = null }) => {
  const res = await fetch(`${url}`, {
    method: "GET",
    headers: headers,
  });

  if (!res.ok) {
    let message;
    // status = res.status
    // try message = res.json || res.text || res.body.message
    const error = new Error("An error occurred while fetching");

    throw error;
  }

  let responseBody = await res.json();

  return responseBody;
};

const _post = async (url, body, options = null) => {
  let headers = DEFAULT_HEADERS;

  if (options?.headers) {
    headers = merge(headers, options.headers);
  }

  const res = await fetch(`${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: headers,
  });

  if (!res.ok) {
    // let message;
    // status = res.status
    // try message = res.json || res.text || res.body.message
    const error = new Error("An error occurred while fetching");

    throw error;
  }

  let responseBody = await res.json();

  return responseBody;
};

const _update = async (url, body, options = null) => {
  let headers = DEFAULT_HEADERS;

  if (options?.headers) {
    headers = merge(headers, options.headers);
  }

  const res = await fetch(`${url}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: headers,
  });

  if (!res.ok) {
    // let message;
    // status = res.status
    // try message = res.json || res.text || res.body.message
    const error = new Error("An error occurred while fetching");

    throw error;
  }

  let responseBody = await res.json();

  return responseBody;
};

const _delete = async (url, body, { headers = null }) => {};

const request = {
  get: _get,
  post: _post,
  update: _update,
  delete: _delete,
};

export default request;
