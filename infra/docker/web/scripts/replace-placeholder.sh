#!/bin/bash
# # no verbose
set +x

# Define the path to the YAML file
YAML_FILE="placeholder.yml"
# Define the path to the .next folder
NEXT_FOLDER="apps/web/.next"

function apply_path {
        # Check if the YAML file exists
    if [ ! -f "$YAML_FILE" ]; then
        echo "Error: YAML file $YAML_FILE not found."
        exit 1
    fi
    # Parse the YAML file and extract keys and values of variables
 while IFS=':' read -r key value; do
    # Remove leading and trailing whitespace from the key and value
    config_key=$(echo "$key" | sed 's/^[ \t]*//;s/[ \t]*$//')
    config_value=$(echo "$value" | sed 's/^[ \t]*//;s/[ \t]*$//')
    

    # Iterate over all environment variables
    while IFS='=' read -r docker_key docker_value; do
        # Check if docker_key matches config_key
        if [ "$docker_key" == "$config_key" ]; then
          
            if [ -n "$docker_value" ]; then
            # Replace the value in the .next folder with the value from Docker runtime
              
     find $NEXT_FOLDER \( -type d -name .git -prune \) -o -type f -print0 | xargs -0 sed -i "s#$config_value#$docker_value#g"
           echo "Replaced value of $config_value with $docker_value in .next folder"
        fi
            break  # Stop iterating once the key is found
        fi
      done < <(env)
  
done < "$YAML_FILE"
}

apply_path
echo "Starting Nextjs"
exec "$@"