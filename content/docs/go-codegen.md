---
title: Generating Go from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate Go ("Golang")
code from schemas. If you're interested in generating code in other languages,
see [this article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article
focuses on using `jtd-codegen` with Go in particular.

## Generating Go with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

You can generate Go with `jtd-codegen` using the `--go-out` option, whose value
must be a directory that `jtd-codegen` can generate code into. You also need to
specify `--go-package`, indicating the name of the package `jtd-codegen` should
generate.

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

Then you can generate Go code into the `src/user` directory, with the package
name `user`, by running:

```bash
jtd-codegen schemas/user.jtd.json --go-out src/user --go-package user
```

Which will output something like:

```text
📝 Writing Go code to: src/user
📦 Generated Go code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/user.go`:

```go
package user

import (
	"time"
)

type User struct {
    CreatedAt time.Time `json:"createdAt"`
    Id string `json:"id"`
    IsAdmin bool `json:"isAdmin"`
    Karma int32 `json:"karma"`
}
```

Note: at the time of writing, generated code is usually not formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated Go code

`jtd-codegen` generates types that are compatible with the `encoding/json`
package in the Go standard library. To use the generated types, import them and
then pass them to `json.Marshal` or `json.Unmarshal`. For example, using the
`User` type generated previously:

```go
// main.go
package main

// This is assuming that we're working in a module called example.com, and that
// the generated code is in the user directory.
import (
    "encoding/json"
    "fmt"

    "example.com/user"
)

func main() {
    // as an example; you can read this from stdin, an HTTP request body, etc.
    input := `{"id": "123", "createdAt": "2021-02-20T02:46:29+00:00", "karma": 3, "isAdmin": false}`

    var u user.User
    if err := json.Unmarshal(input, &u); err != nil {
        panic(err) // it won't panic, because the input is valid
    }

    // Outputs:
    // {2021-02-20 02:46:29 +0000 UTC 123 false 3}
    fmt.Println(u)

    out, err := json.Marshal(u)
    if err != nil {
        panic(err) // won't happen either
    }

    // Outputs:
    // {"createdAt":"2021-02-20T02:46:29Z","id":"123","isAdmin":false,"karma":3}
    fmt.Println(out)
}
```

In the example above, we directly `json.Unmarshal` unvalidated input into the
`jtd-codegen`-generated type. In many cases, this is perfectly fine to do.
However, there are two caveats when doing this:

1. The `encoding/json` package may be more lenient than you expect. For
   instance, it is case-insensitive; users can pass in a property called `id`,
   `ID`, `iD`, etc. and `encoding/json` will figure out what property to use.

2. The errors `encoding/json` produces are Go-specific and low-level.

You can address both of these issues by first validating the input against a JTD
validation implementation, such as
[`github.com/jsontypedef/json-typedef-go`](https://github.com/jsontypedef/json-typedef-go).
What you would do is:

1. Parse the input into a `interface{}`, rather than the generated type.
2. Validate that the parsed `interface{}` is valid against the schema you
   generated your types from. If there are validation errors, you can return
   those, because JTD validation errors are standardized and
   platform-independent.
3. If the input is valid, then parse the input into your generated type.

This solution lets you produce portable validation errors and lets you be more
deliberate about what inputs you do and don't accept. It does, however, come at
the cost of requiring you to parse the JSON input twice.

## Customizing Go output

Go code generation supports the following metadata properties shared across all
languages supported by `jtd-codegen`:

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

  ```go
  package user

  // A user in our system
  type Docuser struct {
      // Whether the user is an admin
      IsAdmin bool `json:"isAdmin"`

      // The user's name
      Name string `json:"name"`
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

  ```go
  package status

  type Status string

  const (
    // The job has been processed.
    StatusDONE Status = "DONE"

    // The job is being processed.
    StatusINPROGRESS Status = "IN_PROGRESS"

    // The job is waiting to be processed.
    StatusPENDING Status = "PENDING"
  )
  ```

Additionally, Go code generation supports the following Go-specific option:

- `goType` overrides the type that `jtd-codegen` should generate. `jtd-codegen`
  will not generate any code for schemas with `goType`, and instead use the
  value of `goType` as-is.

  It is your responsibility to ensure that the value of `goType` is valid code.
  `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "goType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```go
  type OverrideDemo struct {
      IsAdmin MyCustomType `json:"isAdmin"`
      Name string `json:"name"`
  }
  ```

## Generated Go code

This section details the sort of Go code that `jtd-codegen` will generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
Go `interface{}`:

```json
{}
```

Generates into:

```ts
type Empty = interface{}
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

```go
type Ref = Example
type Example = string
```

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | Go type     |
| ----------------- | ----------- |
| `boolean`         | `bool`      |
| `string`          | `string`    |
| `timestamp`       | `time.Time` |
| `float32`         | `float32`   |
| `float64`         | `float64`   |
| `int8`            | `int8`      |
| `uint8`           | `uint8`     |
| `int16`           | `int16`     |
| `uint16`          | `uint16`    |
| `int32`           | `int32`     |
| `uint32`          | `uint32`    |

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

```go
import (
    "time"
)

type Type struct {
    Boolean bool `json:"boolean"`
    Float32 float32 `json:"float32"`
    Float64 float64 `json:"float64"`
    Int16 int16 `json:"int16"`
    Int32 int32 `json:"int32"`
    Int8 int8 `json:"int8"`
    String string `json:"string"`
    Timestamp time.Time `json:"timestamp"`
    Uint16 uint16 `json:"uint16"`
    Uint32 uint32 `json:"uint32"`
    Uint8 uint8 `json:"uint8"`
}
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
Go type alias for `string`, and a `const` value of that type for each of the
possible values:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```go
type Enum string

const (
	EnumDONE Enum = "DONE"
	EnumINPROGRESS Enum = "IN_PROGRESS"
	EnumPENDING Enum = "PENDING"
)
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted
into a Go array of the form `[]T`, where `T` is the type of the elements of the
array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```go
type Elements = []string
```

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a Go struct. Optional properties will be pointer types and will
be marked with `omitempty` in their `json` tag, which means [they will be
omitted from JSON if they are
`nil`](https://golang.org/pkg/encoding/json/#Marshal). Whether "extra"
properties are permitted has no effect on the generated code:

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

```go
type Properties struct {
    IsAdmin bool `json:"isAdmin"`
    Name string `json:"name"`
    MiddleName *string `json:"middleName,omitempty"`
}
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a Go map of the form `map[string]T`, where `T` is the type of the values of the
object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```go
type Values = map[string]string
```

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into a struct with a "tag" property and a property for each of its
mappings. Each mapping will be converted into a Go struct.

The generated code will have custom
[`MarshalJSON`](https://golang.org/pkg/encoding/json/#Marshaler) and
[`UnmarshalJSON`](https://golang.org/pkg/encoding/json/#Unmarshaler)
implementations, which will automatically be used by [the `encoding/json`
package](https://golang.org/pkg/encoding/json/) or any [packages that emulate
`encoding/json`](https://github.com/segmentio/encoding/tree/master/json).

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

```go
import (
	"encoding/json"
	"fmt"
)

type Discriminator struct {
	EventType string

	UserCreated DiscriminatorUserCreated

	UserDeleted DiscriminatorUserDeleted

	UserPaymentPlanChanged DiscriminatorUserPaymentPlanChanged
}

func (v Discriminator) MarshalJSON() ([]byte, error) {
	switch v.EventType {
	case "USER_CREATED":
		return json.Marshal(struct { T string `json:"eventType"`; DiscriminatorUserCreated }{ v.EventType, v.UserCreated })
	case "USER_DELETED":
		return json.Marshal(struct { T string `json:"eventType"`; DiscriminatorUserDeleted }{ v.EventType, v.UserDeleted })
	case "USER_PAYMENT_PLAN_CHANGED":
		return json.Marshal(struct { T string `json:"eventType"`; DiscriminatorUserPaymentPlanChanged }{ v.EventType, v.UserPaymentPlanChanged })
	}

	return nil, fmt.Errorf("bad EventType value: %s", v.EventType)
}

func (v *Discriminator) UnmarshalJSON(b []byte) error {
	var t struct { T string `json:"eventType"` }
	if err := json.Unmarshal(b, &t); err != nil {
		return err
	}

	var err error
	switch t.T {
	case "USER_CREATED":
		err = json.Unmarshal(b, &v.UserCreated)
	case "USER_DELETED":
		err = json.Unmarshal(b, &v.UserDeleted)
	case "USER_PAYMENT_PLAN_CHANGED":
		err = json.Unmarshal(b, &v.UserPaymentPlanChanged)
	default:
		err = fmt.Errorf("bad EventType value: %s", t.T)
	}

	if err != nil {
		return err
	}

	v.EventType = t.T
	return nil
}

type DiscriminatorUserCreated struct {
	ID string `json:"id"`
}

type DiscriminatorUserDeleted struct {
	ID string `json:"id"`

	SoftDelete bool `json:"softDelete"`
}

type DiscriminatorUserPaymentPlanChangedPlan string

const (
	DiscriminatorUserPaymentPlanChangedPlanFree DiscriminatorUserPaymentPlanChangedPlan = "FREE"

	DiscriminatorUserPaymentPlanChangedPlanPaid DiscriminatorUserPaymentPlanChangedPlan = "PAID"
)

type DiscriminatorUserPaymentPlanChanged struct {
	ID string `json:"id"`

	Plan DiscriminatorUserPaymentPlanChangedPlan `json:"plan"`
}
```
