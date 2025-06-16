## Working With GraphQL
This package utilizes [`GraphQL Codegen`](https://the-guild.dev/graphql/codegen#graphql-codegen) to generate types and queries from the Salesforce schema.

### Generating GraphQL Schema
Currently v63 of the Salesforce graphql endpoint throws an error when trying to generate files. This is due to the `Setup__JoinInput` type not generating any fields. To work around this, the `schema.json` file comes from the [Salesforce graphql introspection query](https://www.postman.com/salesforce-developers/salesforce-developers/request/sy8qaf9/introspection-query). This file is then converted to a SDL file using the [graphql-introspection-json-to-sdl](https://github.com/Calcom/graphql-introspection-json-to-sdl) package. You can generate the SDL file by running `yarn generate:schema`.

### Generating Queries
When working with graphql files ensure that `yarn codegen:watch` is running in the background. This will generate the types and queries from the SDL file. 