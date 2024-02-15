const curlCommands = {
  curl: `curl --location 'https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>'`,
  python: `import requests
url = "https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>"

payload = {}
headers = {}

response = requests.request("GET", url, headers=headers, data=payload)

print(response.text)
`,
  ruby: `require "uri"
require "net/http"

url = URI("https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>")

http = Net::HTTP.new(url.host, url.port);
request = Net::HTTP::Get.new(url)

response = http.request(request)
puts response.read_body
`,
  php: `<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
`,
  java: `OkHttpClient client = new OkHttpClient().newBuilder()
  .build();
MediaType mediaType = MediaType.parse("text/plain");
RequestBody body = RequestBody.create(mediaType, "");
Request request = new Request.Builder()
  .url("https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>")
  .method("GET", body)
  .build();
Response response = client.newCall(request).execute();`,
  nodejs: `const axios = require('axios');

let config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: 'https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>',
  headers: { }
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});
`,
  go: `package main

import (
  "fmt"
  "net/http"
  "io/ioutil"
)

func main() {

  url := "https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>"
  method := "GET"

  client := &http.Client {
  }
  req, err := http.NewRequest(method, url, nil)

  if err != nil {
    fmt.Println(err)
    return
  }
  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return
  }
  defer res.Body.Close()

  body, err := ioutil.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return
  }
  fmt.Println(string(body))
}`,
  javascript: `var requestOptions = {
  method: 'GET',
  redirect: 'follow'
};

fetch("https://api.cal.com/v1/bookings/<id>?apiKey=<YOUR_API_KEY>", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`,
}
export default curlCommands
