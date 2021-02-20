---
title: Generating TypeScript from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate TypeScript code
from schemas. If you're interested in generating code in other languages, see
[this article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article
focuses on using `jtd-codegen` with TypeScript in particular.

## Generating TypeScript with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

You can generate TypeScript with `jtd-codegen` using the `--typescript-out`
option, whose value must be a directory that `jtd-codegen` can generate code
into. For example, if you have this schema in `schemas/user.jtd.json`:

```json
{
  "properties": {
    "id": { "type": "string" },
    "createdAt": { "type": "timestamp" },
    "karma": { "type": "int32" },
    "isAdmin": { "type": "boolean" }
  }
}
```

Then you can generate TypeScript code into the `src/user` directory by running:

```bash
jtd-codegen schemas/user.jtd.json --typescript-out src/user
```

Which will output something like:

```text
📝 Writing TypeScript code to: src/user
📦 Generated TypeScript code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/index.ts`:

```ts
export interface User {
  createdAt: string;
  id: string;
  isAdmin: boolean;
  karma: number;
}
```

Note: at the time of writing, generated code is usually not formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated TypeScript code

`jtd-codegen` will always output code into a `index.ts` inside the directory you
specify with `--typescript-out`. In the previous example, we outputted code into
`src/user`, so we can import it like so:

```ts
// src/app.ts
import { User } from './user'
```

Because [TypeScript removes type information at
runtime](https://github.com/microsoft/TypeScript/wiki/FAQ#what-is-type-erasure),
there isn't any way to use the generated types to check if an input is valid.
Instead, if you want to process potentially-invalid input, you should:

1. First, read in the input from JSON if you haven't already.
2. Then, validate the input against your schema. For instance, you can use [the
   `jtd` package](https://github.com/jsontypedef/json-typedef-js) to do this.
   Make sure to use the same schema for validation as you used for code
   generation.
3. If the input is valid against the schema, then you can safely cast the input
   into the `jtd-codegen`-generated type.

From there, you can write most of your code using the `jtd-codegen`-generated
types. The rule of thumb is: use `jtd-codegen`-generated code for compile time,
and use a JTD validator (like `jtd`) when processing inputs at runtime.

## Customizing TypeScript output

TypeScript code generation supports the following metadata properties shared
across all languages supported by `jtd-codegen`:

- `description` customizes the documentation comment to put on a type or
  property in generated code. For example, this schema:

  ```json
  {
    "metadata": {
      "description": "A user in our system"
    },
    "properties": {
      "name": {
        "metadata": {
          "description": "The user's name"
        },
        "type": "string"
      },
      "isAdmin": {
        "metadata": {
          "description": "Whether the user is an admin"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```ts
  /**
   * A user in our system
   */
  export interface User {
    /**
     * Whether the user is an admin
     */
    isAdmin: boolean;

    /**
     * The user's name
     */
    name: string;
  }
  ```

- `enumDescription` is like `description`, but for the members of an `enum`. The
  keys of `enumDescription` should correspond to the values in the schema's
  `enum`, and the values should be descriptions for those values. For example,
  this schema:

  ```json
  {
    "metadata": {
      "enumDescription": {
        "PENDING": "The job is waiting to be processed.",
        "IN_PROGRESS": "The job is being processed.",
        "DONE": "The job has been processed."
      }
    },
    "enum": ["PENDING", "IN_PROGRESS", "DONE"]
  }
  ```

  Generates into:

  ```ts
  export enum Status {
    /**
     * The job has been processed.
     */
    Done = "DONE",

    /**
     * The job is being processed.
     */

    InProgress = "IN_PROGRESS",

    /**
     * The job is waiting to be processed.
     */
    Pending = "PENDING",
  }
  ```

Additionally, TypeScript code generation supports the following
TypeScript-specific option:

- `typescriptType` overrides the type that `jtd-codegen` should generate.
  `jtd-codegen` will not generate any code for schemas with `typescriptType`,
  and instead use the value of `typescriptType` as-is.

  It is your responsibility to ensure that the value of `typescriptType` is
  valid code. `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "typescriptType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```ts
  export interface OverrideDemo {
    isAdmin: MyCustomType;
    name: string;
  }
  ```

## Generated TypeScript code

This section details the sort of TypeScript code that `jtd-codegen` will
generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
TypeScript `any`:

```json
{}
```

Generates into:

```ts
export type Empty = any;
```

### Code generated from "Ref" schemas

["Ref" schemas](/docs/jtd-in-5-minutes#ref-schemas) will be converted into a
reference to the definition being referred to:

```json
{
  "definitions": {
    "example": { "type": "string" }
  },
  "ref": "example"
}
```

Generates into:

```ts
export type Ref = Example;
export type Example = string;
```

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | TypeScript type |
| ----------------- | --------------- |
| `boolean`         | `boolean`       |
| `string`          | `string`        |
| `timestamp`       | `string`        |
| `float32`         | `number`        |
| `float64`         | `number`        |
| `int8`            | `number`        |
| `uint8`           | `number`        |
| `int16`           | `number`        |
| `uint16`          | `number`        |
| `int32`           | `number`        |
| `uint32`          | `number`        |

For example,

```json
{
  "properties": {
    "boolean": { "type": "boolean" },
    "string": { "type": "string" },
    "timestamp": { "type": "timestamp" },
    "float32": { "type": "float32" },
    "float64": { "type": "float64" },
    "int8": { "type": "int8" },
    "uint8": { "type": "uint8" },
    "int16": { "type": "int16" },
    "uint16": { "type": "uint16" },
    "int32": { "type": "int32" },
    "uint32": { "type": "uint32" }
  }
}
```

Generates into:

```ts
export interface Type {
  boolean: boolean;
  float32: number;
  float64: number;
  int16: number;
  int32: number;
  int8: number;
  string: string;
  timestamp: string;
  uint16: number;
  uint32: number;
  uint8: number;
}
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
TypeScript enum:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```ts
export enum Enum {
  Done = "DONE",
  InProgress = "IN_PROGRESS",
  Pending = "PENDING",
}
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted into
a TypeScript array of the form `T[]`, where `T` is the type of the elements of
the array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```ts
export type Elements = string[];
```

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a TypeScript interface. Optional properties will be marked with
`?`. Whether "extra" properties are permitted has no effect on the generated
code:

```json
{
  "properties": {
    "name": { "type": "string" },
    "isAdmin": { "type": "boolean" }
  },
  "optionalProperties": {
    "middleName": { "type": "string" }
  },
  "additionalProperties": true
}
```

Generates into:

```ts
export interface Properties {
  isAdmin: boolean;
  name: string;
  middleName?: string;
}
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a TypeScript object of the form `{ [key: string]: T }`, where `T` is the type of
the values of the object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```ts
export type Values = { [key: string]: string };
```

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into a union of each of the types generated for the mapping. Each of
the generated mapping types will have the "tag" property with a constant value.
This sort of code is well-understood by the TypeScript compiler, [as documented
in the TypeScript
handbook](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions):

```json
{
  "discriminator": "eventType",
  "mapping": {
    "USER_CREATED": {
      "properties": {
        "id": { "type": "string" }
      }
    },
    "USER_PAYMENT_PLAN_CHANGED": {
      "properties": {
        "id": { "type": "string" },
        "plan": { "enum": ["FREE", "PAID"] }
      }
    },
    "USER_DELETED": {
      "properties": {
        "id": { "type": "string" },
        "softDelete": { "type": "boolean" }
      }
    }
  }
}
```

Generates into:

```ts
export type Discriminator = DiscriminatorUserCreated
  | DiscriminatorUserDeleted
  | DiscriminatorUserPaymentPlanChanged;

export interface DiscriminatorUserCreated {
  eventType: "USER_CREATED";
  id: string;
}

export interface DiscriminatorUserDeleted {
  eventType: "USER_DELETED";
  id: string;
  softDelete: boolean;
}

export enum DiscriminatorUserPaymentPlanChangedPlan {
  Free = "FREE",
  Paid = "PAID",
}

export interface DiscriminatorUserPaymentPlanChanged {
  eventType: "USER_PAYMENT_PLAN_CHANGED";
  id: string;
  plan: DiscriminatorUserPaymentPlanChangedPlan;
}
```
