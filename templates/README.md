# How to add a new model or endpoint

Basically there's three places of the codebase you need to think about for each feature.

/pages/api/

- This is the most important one, and where your endpoint will live. You will leverage nextjs dynamic routes and expose one file for each endpoint you want to support ideally.

## How the codebase is organized.

## The example resource -model- and it's endpoints

### `pages/api/endpoint/`
| Method | route | action |
| ------ | ----- | -----  |
| GET | pages/api/endpoint/index.ts | Read All of your resource |
| POST |pages/api/endpoint/new.ts | Create new resource |

### `pages/api/endpoint/[id]/`

| Method | route                             | action                    |
| ------ | --------------------------------- | ------------------------- |
| GET    | pages/api/endpoint/[id]/index.ts  | Read All of your resource |
| PATCH  | pages/api/endpoint/[id]/edit.ts   | Create new resource       |
| DELETE | pages/api/endpoint/[id]/delete.ts | Create new resource       |

## `/tests/`

This is where all your endpoint's tests live, we mock prisma calls. We aim for at least 50% global coverage. Please test each of your endpoints.

### `/tests/endpoint/`

| route                                  | action                                         |
| -------------------------------------- | ---------------------------------------------- |
| /tests/endpoint/resource.index.test.ts | Test for your pages/api/endpoint/index.ts file |
| tests/endpoint/resource.new.test.ts    | Create new resource                            |

### `/tests/endpoint/[id]/`

| route                                          | action                    |
| ---------------------------------------------- | ------------------------- |
| `/tests/endpoint/[id]/resource.index.test.ts`  | Read All of your resource |
| `/tests/endpoint/[id]/resource.edit.test.ts`   | Create new resource       |
| `/tests/endpoint/[id]/resource.delete.test.ts` | Create new resource       |

## `/lib/validations/yourEndpoint.ts`

- This is where our model validations, live, we try to make a 1:1 for db models, and also extract out any re-usable code into the /lib/validations/shared/ sub-folder.
