---
title: Generating Rust from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate Rust code from
schemas. If you're interested in generating code in other languages, see [this
article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article focuses
on using `jtd-codegen` with Rust in particular.

## Generating Rust with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

You can generate Rust with `jtd-codegen` using the `--rust-out` option, whose
value must be a directory that `jtd-codegen` can generate code into.

For example, if you have this schema in `schemas/user.jtd.json`:

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

Then you can generate Rust code into the `src/user` directory by running:

```bash
jtd-codegen schemas/user.jtd.json --rust-out src/user
```

Which will output something like:

```text
📝 Writing Rust code to: src/user
📦 Generated Rust code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/mod.rs`:

```rs
use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "createdAt")]
    pub createdAt: DateTime<FixedOffset>,

    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "isAdmin")]
    pub isAdmin: bool,

    #[serde(rename = "karma")]
    pub karma: i32,
}
```

Note: at the time of writing, generated code is not always formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated Rust code

`jtd-codegen` will always output code into a `mod.rs` inside the directory you
specify with `--rust-out`. In the previous example, we outputted code into
`src/user`, so we can import it like so:

```rust
use user::User;
```

The generated Rust code is meant to be used with [the `serde_json`
crate](https://github.com/serde-rs/json). To use the generated types, pass them
as a parameter to `serde_json::from_str` / `serde_json::to_string` (or whatever
variant of those methods is relevant to you).

For example:

```rs
// To read in JSON, do something like:
let input_json = "...";
let user: User = serde_json::from_str(input_json)?;

// To write out JSON, do something like:
serde_json::to_string(&user)?;
```

In the example above, we directly `serde_json::from_str` unvalidated input into
the `jtd-codegen`-generated type. In many cases, this is perfectly fine to do.
However, there are is a caveat when doing this: the errors `serde_json` produces
are Rust-specific and low-level.

You can address this issue (if it is an issue for your use-case) by first
validating the input against a JTD validation implementation, such as [the `jtd`
crate](https://github.com/jsontypedef/json-typedef-rust). What you would do is:

1. Parse the input into a `serde_json::Value`, rather than the generated type.
2. Validate that the parsed `serde_json::Value` is valid against the schema you
   generated your types from. If there are validation errors, you can return
   those, because JTD validation errors are standardized and
   platform-independent.
3. If the input is valid, then parse the `Value` into your generated type. You
   can do this using `serde_json::from_value`.

This solution lets you produce portable validation errors. It does, however,
come at the cost of requiring you to process the input JSON document tree twice.

## Customizing Rust output

Rust code generation supports the following metadata properties shared across
all languages supported by `jtd-codegen`:

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

  ```rs
  use serde::{Deserialize, Serialize};

  /// A user in our system
  #[derive(Serialize, Deserialize)]
  pub struct User {
      /// Whether the user is an admin
      #[serde(rename = "isAdmin")]
      pub isAdmin: bool,

      /// The user's name
      #[serde(rename = "name")]
      pub name: String,
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

  ```rs
  use serde::{Deserialize, Serialize};

  #[derive(Serialize, Deserialize)]
  pub enum Status {
    /// The job has been processed.
    #[serde(rename = "DONE")]
    Done,

    /// The job is being processed.
    #[serde(rename = "IN_PROGRESS")]
    InProgress,

    /// The job is waiting to be processed.
    #[serde(rename = "PENDING")]
    Pending,
  }
  ```

Additionally, Rust code generation supports the following Rust-specific options:

- `rustType` overrides the type that `jtd-codegen` should generate.
  `jtd-codegen` will not generate any code for schemas with `rustType`, and
  instead use the value of `rustType` as-is.

  It is your responsibility to ensure that the value of `rustType` is valid
  code. `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "rustType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```rs
  use serde::{Deserialize, Serialize};

  #[derive(Serialize, Deserialize)]
  pub struct OverrideDemo {
      #[serde(rename = "isAdmin")]
      pub isAdmin: MyCustomType,

      #[serde(rename = "name")]
      pub name: String,
  }
  ```

## Generated Rust code

This section details the sort of Rust code that `jtd-codegen` will generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
Rust `Option<serde_json::Value>`:

```json
{}
```

Generates into:

```rs
use serde_json::{Value};

pub type Empty = Option<Value>;
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

```rs
pub type Ref = Example;
pub type Example = String;
```

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | Rust type                               |
| ----------------- | --------------------------------------- |
| `boolean`         | `bool`                                  |
| `string`          | `String`                                |
| `timestamp`       | `chrono::DateTime<chrono::FixedOffset>` |
| `float32`         | `f32`                                   |
| `float64`         | `f64`                                   |
| `int8`            | `i8`                                    |
| `uint8`           | `u8`                                    |
| `int16`           | `i16`                                   |
| `uint16`          | `u16`                                   |
| `int32`           | `i32`                                   |
| `uint32`          | `u32`                                   |

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

```rs
use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Type {
    #[serde(rename = "boolean")]
    pub boolean: bool,

    #[serde(rename = "float32")]
    pub float32: f32,

    #[serde(rename = "float64")]
    pub float64: f64,

    #[serde(rename = "int16")]
    pub int16: i16,

    #[serde(rename = "int32")]
    pub int32: i32,

    #[serde(rename = "int8")]
    pub int8: i8,

    #[serde(rename = "string")]
    pub string: String,

    #[serde(rename = "timestamp")]
    pub timestamp: DateTime<FixedOffset>,

    #[serde(rename = "uint16")]
    pub uint16: u16,

    #[serde(rename = "uint32")]
    pub uint32: u32,

    #[serde(rename = "uint8")]
    pub uint8: u8,
}
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
Rust `enum`:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum Enum {
    #[serde(rename = "DONE")]
    Done,

    #[serde(rename = "IN_PROGRESS")]
    InProgress,

    #[serde(rename = "PENDING")]
    Pending,
}
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted
into a Rust `Vec<T>`, where `T` is the type of the elements of the array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```rs
pub type Elements = Vec<String>;
```

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a Rust `struct`. Optional properties will be wrapped with
`Optional` and a `skip_serializing_if` on `Option::is_none`, so they will be
omitted from JSON if set to `None`.

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

```rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Properties {
    #[serde(rename = "isAdmin")]
    pub isAdmin: bool,

    #[serde(rename = "name")]
    pub name: String,

    #[serde(rename = "middleName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub middleName: Option<Box<String>>,
}
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a Rust `HashMap<String, T>`, where `T` is the type of the values of the object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```rs
use std::collections::{HashMap};

pub type Values = HashMap<String, String>;
```

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into a Rust `enum`, and each mapping will be a member of that `enum`.
A set of tags on the discriminator tells serde to use an [adjacently tagged
representation](https://serde.rs/enum-representations.html#adjacently-tagged)
for the enum.

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

```rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(tag = "eventType")]
pub enum Discriminator {
    #[serde(rename = "USER_CREATED")]
    UserCreated(DiscriminatorUserCreated),

    #[serde(rename = "USER_DELETED")]
    UserDeleted(DiscriminatorUserDeleted),

    #[serde(rename = "USER_PAYMENT_PLAN_CHANGED")]
    UserPaymentPlanChanged(DiscriminatorUserPaymentPlanChanged),
}

#[derive(Serialize, Deserialize)]
pub struct DiscriminatorUserCreated {
    #[serde(rename = "id")]
    pub id: String,
}

#[derive(Serialize, Deserialize)]
pub struct DiscriminatorUserDeleted {
    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "softDelete")]
    pub softDelete: bool,
}

#[derive(Serialize, Deserialize)]
pub enum DiscriminatorUserPaymentPlanChangedPlan {
    #[serde(rename = "FREE")]
    Free,

    #[serde(rename = "PAID")]
    Paid,
}

#[derive(Serialize, Deserialize)]
pub struct DiscriminatorUserPaymentPlanChanged {
    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "plan")]
    pub plan: DiscriminatorUserPaymentPlanChangedPlan,
}
```
