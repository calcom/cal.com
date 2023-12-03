
# Make sure api server is running. Must use individual app dev command instead of top-level dev command.
if curl -is http://localhost:3002/docs | head -n 1 | grep -q "OK"
then
  echo "Local API server is running."
else
  echo "Could not fetch OpenAPI spec."
  exit 1
fi

# This is just an initial set of languages. Expanding should be simple enough
# As users request more language support, we just need to add them here.
#  The full list of supported client generators can be found using this command:
# docker run --rm openapitools/openapi-generator-cli list
for language in go typescript-fetch python
do
echo "Generating SDK for $language"
output=`\
docker run --rm -v "${PWD}:/local" --network host openapitools/openapi-generator-cli generate \
    -i http://host.docker.internal:3002/docs \
    -g $language \
    -o /local/sdks/$language 2>&1` || echo $output
done
echo "Finished."