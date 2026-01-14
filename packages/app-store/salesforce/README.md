# Creating a Salesforce test org
You must have the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) installed to create a test org. Once installed, you can create a test org using the following command `yarn scratch-org:create`

This will create a scratch org with the configuration specified in the `project-scratch-def.json` file.

To open a browser tab to the org, run `yarn scratch-org:start`

# Working With GraphQL
This package utilizes [`GraphQL Codegen`](https://the-guild.dev/graphql/codegen#graphql-codegen) to generate types and queries from the Salesforce schema.

### Generating GraphQL Schema
Currently v63 of the Salesforce graphql endpoint throws an error when trying to generate files. This is due to the `Setup__JoinInput` type not generating any fields. To work around this, the `schema.json` file comes from the [Salesforce graphql introspection query](https://www.postman.com/salesforce-developers/salesforce-developers/request/sy8qaf9/introspection-query). This file is then converted to a SDL file using the [graphql-introspection-json-to-sdl](https://github.com/Calcom/graphql-introspection-json-to-sdl) package. You can generate the SDL file by running `yarn generate:schema`.

### Generating Queries
When working with graphql files ensure that `yarn codegen:watch` is running in the background. This will generate the types and queries from the SDL file.

# Developing the SFDC package
The SFDC package is written using Apex. To develop this package, you need to have the Salesforce CLI installed. Then you can run `yarn sfdc:deploy:preview` to see what changes will be deployed to the scratch org. Running `yarn sfdc:deploy` will deploy the changes to the scratch org.

Note that if you want to call your local development instances you need to change the "Named Credential" on the scratch org settings to point the `CalCom_Development` credential to the local instance.
