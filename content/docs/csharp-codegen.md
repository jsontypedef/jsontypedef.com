---
title: Generating C# from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate C# code from
schemas. If you're interested in generating code in other languages, see [this
article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article focuses
on using `jtd-codegen` with C# in particular.

## Generating C# with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

At time time of writing, `jtd-codegen` only supports generating C# code that
uses the
[System.Text.Json](https://docs.microsoft.com/en-us/dotnet/api/system.text.json?view=net-5.0)
JSON library. Support for [Newtonsoft.Json](https://www.newtonsoft.com/json) is
planned but not yet implemented.

You can generate C# with `jtd-codegen` using the `--csharp-system-text-out`
option, whose value must be a directory that `jtd-codegen` can generate code
into. You also need to specify `--csharp-system-text-namespace`, indicating the
name of the namespace `jtd-codegen` should generate.

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

Then you can generate C# code into the `src/user` directory, with the namespace
name `Example.User`, by running:

```bash
jtd-codegen schemas/user.jtd.json --csharp-system-text-out src/user --csharp-system-text-namespace Example.User
```

Which will output something like:

```text
📝 Writing C# + System.Text.Json code to: src/user
📦 Generated C# + System.Text.Json code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/User.cs`:

```cs
using System;
using System.Text.Json.Serialization;

namespace Example.User
{
    public class User
    {
        [JsonPropertyName("createdAt")]
        public DateTimeOffset CreatedAt { get; set; }

        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; }

        [JsonPropertyName("karma")]
        public int Karma { get; set; }
    }
}
```

Note: at the time of writing, generated code is not always formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated C# code

Code generated using `jtd-codegen --csharp-system-text-out` is compatible with
the the
[System.Text.Json](https://docs.microsoft.com/en-us/dotnet/api/system.text.json?view=net-5.0)
JSON library. To use the generated types, import them and then pass them to a
System.Text.Json's `JsonSerializer` as you would usually do.

For example, we might import the generated `User` class above as:

```cs
using Example.User;
```

And then pass it to `JsonConvert` as:

```cs
// To read in JSON, do something like:
string input = "...";
User user = JsonSerializer.Deserialize<User>(input);

// To write out JSON, do something like:
string output = JsonSerializer.Serialize(user);
```

In the example above, we directly `Deserialize` unvalidated input into the
`jtd-codegen`-generated type. In many cases, this is perfectly fine to do.
However, there are two caveats when doing this:

1. The System.Text.Json package may be more lenient than you expect. For
   instance, System.Text.Json accepts JSON `null` for `string` fields (which is
   very reasonable behavior, but may be undesirable for your application). You
   may find yourself accepting inputs you never intended to, and this can cause
   challenges if users come to depend on this behavior.

2. The errors System.Text.Json produces are C#-specific and relatively
   low-level.

You can address both of these issues by first validating the input against a JTD
validation implementation, such as [the `Jtd.Jtd`
package](https://github.com/jsontypedef/json-typedef-csharp). What you would do
is:

1. Parse the input into a System.Text.Json `JsonDocument`, rather than the
   generated type. You can do this using `JsonDocument.Parse`.
2. Validate that the parsed `JsonDocument` is valid against the schema you
   generated your types from, using a JTD validation implementation. If there
   are validation errors, you can return those, because JTD validation errors
   are standardized and platform-independent.
3. If the input is valid, then parse the input JSON into your generated type
   as you usually would.

This solution lets you produce portable validation errors and lets you be more
deliberate about what inputs you do and don't accept. However, it comes at the
cost of having to process the JSON input twice.

## Customizing C# output

C# code generation supports the following metadata properties shared across all
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

  ```cs
  using System.Text.Json.Serialization;

  namespace Example
  {
      /// <summary>
      /// A user in our system
      /// </summary>
      public class User
      {
          /// <summary>
          /// Whether the user is an admin
          /// </summary>
          [JsonPropertyName("isAdmin")]
          public bool IsAdmin { get; set; }

          /// <summary>
          /// The user's name
          /// </summary>
          [JsonPropertyName("name")]
          public string Name { get; set; }
      }
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

  ```cs
  using System;
  using System.Text.Json;
  using System.Text.Json.Serialization;

  namespace Example
  {
      [JsonConverter(typeof(StatusJsonConverter))]
      public enum Status
      {
          /// <summary>
          /// The job has been processed.
          /// </summary>
          Done,

          /// <summary>
          /// The job is being processed.
          /// </summary>
          InProgress,

          /// <summary>
          /// The job is waiting to be processed.
          /// </summary>
          Pending,
      }

      public class StatusJsonConverter : JsonConverter<Status>
      {
          public override Status Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
          {
              string value = JsonSerializer.Deserialize<string>(ref reader, options);
              switch (value)
              {
                  case "DONE":
                      return Status.Done;
                  case "IN_PROGRESS":
                      return Status.InProgress;
                  case "PENDING":
                      return Status.Pending;
                  default:
                      throw new ArgumentException(String.Format("Bad Status value: {0}", value));
              }
          }

          public override void Write(Utf8JsonWriter writer, Status value, JsonSerializerOptions options)
          {
              switch (value)
              {
                  case Status.Done:
                      JsonSerializer.Serialize<string>(writer, "DONE", options);
                      return;
                  case Status.InProgress:
                      JsonSerializer.Serialize<string>(writer, "IN_PROGRESS", options);
                      return;
                  case Status.Pending:
                      JsonSerializer.Serialize<string>(writer, "PENDING", options);
                      return;
              }
          }
      }
  }
  ```

Additionally, C# code generation supports the following C#-specific options:

- `csharpSystemTextType` overrides the type that `jtd-codegen` should generate.
  `jtd-codegen` will not generate any code for schemas with
  `csharpSystemTextType`, and instead use the value of `csharpSystemTextType`
  as-is.

  It is your responsibility to ensure that the value of `csharpSystemTextType`
  is valid code. `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "csharpSystemTextType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```cs
  using System.Text.Json.Serialization;

  namespace Example
  {
      public class OverrideDemo
      {
          [JsonPropertyName("isAdmin")]
          public MyCustomType IsAdmin { get; set; }

          [JsonPropertyName("name")]
          public string Name { get; set; }
      }
  }
  ```

- `csharpSystemTextContainer` overrides the type that `jtd-codegen` uses for
  lists and dictionaries. By default, generated code uses
  `System.Collections.Generic.IList` and
  `System.Collections.Generic.IDictionary`, but you can override this with
  `csharpSystemTextContainer`.

  It is your responsibility to ensure that the value of
  `csharpSystemTextContainer` is valid code. `jtd-codegen` will not attempt to
  validate its value.

  In particular, you should make sure your chosen type for lists supports
  parameterizing its value (i.e. it should be something that can be invoked as
  `Foo<T>`) and your type for dictionaries supports `string` as its first value,
  and valid `T` for its second value (i.e. it should be something that can be
  invoked as `Foo<string, T>`).

  For example:

  ```json
  {
    "properties": {
      "example_list": {
        "metadata": {
          "csharpSystemTextContainer": "MyCustomList"
        },
        "elements": {
          "type": "string"
        }
      },
      "example_map": {
        "metadata": {
          "csharpSystemTextContainer": "MyCustomDictionary"
        },
        "values": {
          "type": "string"
        }
      }
    }
  }
  ```

  Generates into:

  ```cs
  using System.Text.Json.Serialization;

  namespace Example
  {
      public class ContainerOverrides
      {
          [JsonPropertyName("example_list")]
          public MyCustomList<string> ExampleList { get; set; }

          [JsonPropertyName("example_map")]
          public MyCustomDictionary<string, string> ExampleMap { get; set; }
      }
  }
  ```

## Generated C# code

This section details the sort of C# code that `jtd-codegen` will generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
C# `object`:

```json
{}
```

Generates into:

```cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(EmptyJsonConverter))]
    public class Empty
    {
        /// <summary>
        /// The underlying data being wrapped.
        /// </summary>
        public object Value { get; set; }
    }

    public class EmptyJsonConverter : JsonConverter<Empty>
    {
        public override Empty Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return new Empty { Value = JsonSerializer.Deserialize<object>(ref reader, options) };
        }

        public override void Write(Utf8JsonWriter writer, Empty value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize<object>(writer, value.Value, options);
        }
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in C#. In real-world schemas, this doesn't happen very often._

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

```cs
// Ref.cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(RefJsonConverter))]
    public class Ref
    {
        /// <summary>
        /// The underlying data being wrapped.
        /// </summary>
        public Example Value { get; set; }
    }

    public class RefJsonConverter : JsonConverter<Ref>
    {
        public override Ref Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return new Ref { Value = JsonSerializer.Deserialize<Example>(ref reader, options) };
        }

        public override void Write(Utf8JsonWriter writer, Ref value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize<Example>(writer, value.Value, options);
        }
    }
}

// Example.cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(ExampleJsonConverter))]
    public class Example
    {
        /// <summary>
        /// The underlying data being wrapped.
        /// </summary>
        public string Value { get; set; }
    }

    public class ExampleJsonConverter : JsonConverter<Example>
    {
        public override Example Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return new Example { Value = JsonSerializer.Deserialize<string>(ref reader, options) };
        }

        public override void Write(Utf8JsonWriter writer, Example value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize<string>(writer, value.Value, options);
        }
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in C#. In real-world schemas, this doesn't happen very often._

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | C# type                 |
| ----------------- | ----------------------- |
| `boolean`         | `bool`                  |
| `string`          | `string`                |
| `timestamp`       | `System.DateTimeOffset` |
| `float32`         | `float`                 |
| `float64`         | `double`                |
| `int8`            | `sbyte`                 |
| `uint8`           | `byte`                  |
| `int16`           | `short`                 |
| `uint16`          | `ushort`                |
| `int32`           | `int`                   |
| `uint32`          | `uint`                  |

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

```cs
using System;
using System.Text.Json.Serialization;

namespace Example
{
    public class Type_
    {
        [JsonPropertyName("boolean")]
        public bool Boolean_ { get; set; }

        [JsonPropertyName("float32")]
        public float Float32 { get; set; }

        [JsonPropertyName("float64")]
        public double Float64 { get; set; }

        [JsonPropertyName("int16")]
        public short Int16_ { get; set; }

        [JsonPropertyName("int32")]
        public int Int32_ { get; set; }

        [JsonPropertyName("int8")]
        public sbyte Int8 { get; set; }

        [JsonPropertyName("string")]
        public string String_ { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTimeOffset Timestamp { get; set; }

        [JsonPropertyName("uint16")]
        public ushort Uint16 { get; set; }

        [JsonPropertyName("uint32")]
        public uint Uint32 { get; set; }

        [JsonPropertyName("uint8")]
        public byte Uint8 { get; set; }
    }
}
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
C# enum, with a custom `Serializer` that will handle converting to/from JSON
strings:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(Enum_JsonConverter))]
    public enum Enum_
    {
        Done,
        InProgress,
        Pending,
    }

    public class Enum_JsonConverter : JsonConverter<Enum_>
    {
        public override Enum_ Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            string value = JsonSerializer.Deserialize<string>(ref reader, options);
            switch (value)
            {
                case "DONE":
                    return Enum_.Done;
                case "IN_PROGRESS":
                    return Enum_.InProgress;
                case "PENDING":
                    return Enum_.Pending;
                default:
                    throw new ArgumentException(String.Format("Bad Enum_ value: {0}", value));
            }
        }

        public override void Write(Utf8JsonWriter writer, Enum_ value, JsonSerializerOptions options)
        {
            switch (value)
            {
                case Enum_.Done:
                    JsonSerializer.Serialize<string>(writer, "DONE", options);
                    return;
                case Enum_.InProgress:
                    JsonSerializer.Serialize<string>(writer, "IN_PROGRESS", options);
                    return;
                case Enum_.Pending:
                    JsonSerializer.Serialize<string>(writer, "PENDING", options);
                    return;
            }
        }
    }
}
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted
into a C# `System.Collections.Generic.IList<T>`, where `T` is the type of the
elements of the array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```cs
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(ElementsJsonConverter))]
    public class Elements
    {
        /// <summary>
        /// The underlying data being wrapped.
        /// </summary>
        public IList<string> Value { get; set; }
    }

    public class ElementsJsonConverter : JsonConverter<Elements>
    {
        public override Elements Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return new Elements { Value = JsonSerializer.Deserialize<IList<string>>(ref reader, options) };
        }

        public override void Write(Utf8JsonWriter writer, Elements value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize<IList<string>>(writer, value.Value, options);
        }
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in C#. In real-world schemas, this doesn't happen very often._

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a C# POCO. Optional properties will be annotated with
`[JsonIgnore]` with condition `WhenWritingDefault`, which means that they will
be omitted from JSON if set to `null`.

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

```cs
using System.Text.Json.Serialization;

namespace Example
{
    public class Properties
    {
        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("middleName")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public string MiddleName { get; set; }

    }
}
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a C# `System.Collections.Generic.IDictionary<string, T>`, where `T` is the type
of the values of the object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```cs
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(ValuesJsonConverter))]
    public class Values
    {
        /// <summary>
        /// The underlying data being wrapped.
        /// </summary>
        public IDictionary<string, string> Value { get; set; }
    }

    public class ValuesJsonConverter : JsonConverter<Values>
    {
        public override Values Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return new Values { Value = JsonSerializer.Deserialize<IDictionary<string, string>>(ref reader, options) };
        }

        public override void Write(Utf8JsonWriter writer, Values value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize<IDictionary<string, string>>(writer, value.Value, options);
        }
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in C#. In real-world schemas, this doesn't happen very often._

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into an abstract class, and each mapping will be a concrete
implementation of that class. The abstract class will have a custom serializer
that can the "tag" property to figure out which instance to create:

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

```cs
// Discriminator.cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(DiscriminatorJsonConverter))]
    public abstract class Discriminator
    {
    }

    public class DiscriminatorJsonConverter : JsonConverter<Discriminator>
    {
        public override Discriminator Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var readerCopy = reader;
            var tagValue = JsonDocument.ParseValue(ref reader).RootElement.GetProperty("eventType").GetString();

            switch (tagValue)
            {
                case "USER_CREATED":
                    return JsonSerializer.Deserialize<DiscriminatorUserCreated>(ref readerCopy, options);
                case "USER_DELETED":
                    return JsonSerializer.Deserialize<DiscriminatorUserDeleted>(ref readerCopy, options);
                case "USER_PAYMENT_PLAN_CHANGED":
                    return JsonSerializer.Deserialize<DiscriminatorUserPaymentPlanChanged>(ref readerCopy, options);
                default:
                    throw new ArgumentException(String.Format("Bad EventType value: {0}", tagValue));
            }
        }

        public override void Write(Utf8JsonWriter writer, Discriminator value, JsonSerializerOptions options)
        {
            JsonSerializer.Serialize(writer, value, value.GetType(), options);
        }
    }
}

// DiscriminatorUserCreated.cs
using System.Text.Json.Serialization;

namespace Example
{
    public class DiscriminatorUserCreated : Discriminator
    {
        [JsonPropertyName("eventType")]
        public string EventType { get => "USER_CREATED"; }

        [JsonPropertyName("id")]
        public string Id { get; set; }
    }
}

// DiscriminatorUserDeleted.cs
using System.Text.Json.Serialization;

namespace Example
{
    public class DiscriminatorUserDeleted : Discriminator
    {
        [JsonPropertyName("eventType")]
        public string EventType { get => "USER_DELETED"; }

        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("softDelete")]
        public bool SoftDelete { get; set; }
    }
}

// DiscriminatorUserPaymentPlanChanged.cs
using System.Text.Json.Serialization;

namespace Example
{
    public class DiscriminatorUserPaymentPlanChanged : Discriminator
    {
        [JsonPropertyName("eventType")]
        public string EventType { get => "USER_PAYMENT_PLAN_CHANGED"; }

        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("plan")]
        public DiscriminatorUserPaymentPlanChangedPlan Plan { get; set; }
    }
}

// DiscriminatorUserPaymentPlanChangedPlan.cs
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Example
{
    [JsonConverter(typeof(DiscriminatorUserPaymentPlanChangedPlanJsonConverter))]
    public enum DiscriminatorUserPaymentPlanChangedPlan
    {
        Free,
        Paid,
    }
    public class DiscriminatorUserPaymentPlanChangedPlanJsonConverter : JsonConverter<DiscriminatorUserPaymentPlanChangedPlan>
    {
        public override DiscriminatorUserPaymentPlanChangedPlan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            string value = JsonSerializer.Deserialize<string>(ref reader, options);
            switch (value)
            {
                case "FREE":
                    return DiscriminatorUserPaymentPlanChangedPlan.Free;
                case "PAID":
                    return DiscriminatorUserPaymentPlanChangedPlan.Paid;
                default:
                    throw new ArgumentException(String.Format("Bad DiscriminatorUserPaymentPlanChangedPlan value: {0}", value));
            }
        }

        public override void Write(Utf8JsonWriter writer, DiscriminatorUserPaymentPlanChangedPlan value, JsonSerializerOptions options)
        {
            switch (value)
            {
                case DiscriminatorUserPaymentPlanChangedPlan.Free:
                    JsonSerializer.Serialize<string>(writer, "FREE", options);
                    return;
                case DiscriminatorUserPaymentPlanChangedPlan.Paid:
                    JsonSerializer.Serialize<string>(writer, "PAID", options);
                    return;
            }
        }
    }
}
```
