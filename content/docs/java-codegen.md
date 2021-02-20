---
title: Generating Java from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate Java
code from schemas. If you're interested in generating code in other languages,
see [this article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article
focuses on using `jtd-codegen` with Java in particular.

## Generating Java with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

At time time of writing, `jtd-codegen` only supports generating Java code that
uses the [Jackson](https://github.com/FasterXML/jackson) JSON library. Support
for [Gson](https://github.com/google/gson) is planned but not yet implemented.

You can generate Java with `jtd-codegen` using the `--java-jackson-out` option,
whose value must be a directory that `jtd-codegen` can generate code into. You
also need to specify `--java-jackson-package`, indicating the name of the
package `jtd-codegen` should generate.

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

Then you can generate Java code into the `src/user` directory, with the package
name `com.example.user`, by running:

```bash
jtd-codegen schemas/user.jtd.json --java-jackson-out src/user --java-jackson-package com.example.user
```

Which will output something like:

```text
📝 Writing Java + Jackson code to: src/user
📦 Generated Java + Jackson code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/User.java`:

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.time.OffsetDateTime;

@JsonSerialize
public class User {
    @JsonProperty("createdAt")
    private OffsetDateTime createdAt;

    @JsonProperty("id")
    private String id;

    @JsonProperty("isAdmin")
    private Boolean isAdmin;

    @JsonProperty("karma")
    private Integer karma;

    public User() {
    }

    /**
     * Getter for createdAt.<p>
     */
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Setter for createdAt.<p>
     */
    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Getter for id.<p>
     */
    public String getId() {
        return id;
    }

    /**
     * Setter for id.<p>
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * Getter for isAdmin.<p>
     */
    public Boolean getIsAdmin() {
        return isAdmin;
    }

    /**
     * Setter for isAdmin.<p>
     */
    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    /**
     * Getter for karma.<p>
     */
    public Integer getKarma() {
        return karma;
    }

    /**
     * Setter for karma.<p>
     */
    public void setKarma(Integer karma) {
        this.karma = karma;
    }
}
```

Note: at the time of writing, generated code is not always formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated Java code

Code generated using `jtd-codegen --java-jackson-out` is compatible with the the
[Jackson](https://github.com/FasterXML/jackson) JSON library. To use the
generated types, import them and then pass them to a Jackson `ObjectMapper` as
you would usually do.

For example, we might import the generated `User` class above as:

```java
import com.example.User;
```

And then pass it to an `ObjectMapper` as:

```java
ObjectMapper objectMapper = new ObjectMapper();

// To read in JSON, do something like:
String input = "...";
User user = objectMapper.readValue(input, User.class);

// To write out JSON, do something like:
String output = objectMapper.writeValueAsString(user);
```

In the example above, we directly `readValue` unvalidated input into the
`jtd-codegen`-generated type. In many cases, this is perfectly fine to do.
However, there are two caveats when doing this:

1. The Jackson package may be more lenient than you expect. For instance, by
   default Jackson accepts JSON numbers for `String` fields. You may find
   yourself accepting inputs you never intended to, and this can cause
   challenges if users come to depend on this behavior.

2. The errors Jackson produces are Java-specific and relatively low-level.

You can address both of these issues by first validating the input against a JTD
validation implementation, such as [the `com.jsontypedef.jtd`
package](https://github.com/jsontypedef/json-typedef-java). What you would do
is:

1. Parse the input into a Jackson `JsonNode`, rather than the generated type.
   You can do this with the `readTree` method on `ObjectMapper`.
2. Validate that the parsed `JsonNode` is valid against the schema you generated
   your types from, using a JTD validation implementation. If there are
   validation errors, you can return those, because JTD validation errors are
   standardized and platform-independent.
3. If the input is valid, then read the `JsonNode` into your generated type
   using the `treeToValue` method on `ObjectMapper`.

This solution lets you produce portable validation errors and lets you be more
deliberate about what inputs you do and don't accept.

## Customizing Java output

Java code generation supports the following metadata properties shared across
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

  ```java
  package com.example;

  import com.fasterxml.jackson.annotation.JsonProperty;
  import com.fasterxml.jackson.databind.annotation.JsonSerialize;

  /**
  * A user in our system
  */
  @JsonSerialize
  public class Docuser {
      @JsonProperty("isAdmin")
      private Boolean isAdmin;

      @JsonProperty("name")
      private String name;

      public Docuser() {
      }

      /**
      * Getter for isAdmin.<p>
      * Whether the user is an admin
      */
      public Boolean getIsAdmin() {
          return isAdmin;
      }

      /**
      * Setter for isAdmin.<p>
      * Whether the user is an admin
      */
      public void setIsAdmin(Boolean isAdmin) {
          this.isAdmin = isAdmin;
      }

      /**
      * Getter for name.<p>
      * The user's name
      */
      public String getName() {
          return name;
      }

      /**
      * Setter for name.<p>
      * The user's name
      */
      public void setName(String name) {
          this.name = name;
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

  ```java
  package com.example;

  import com.fasterxml.jackson.annotation.JsonProperty;

  public enum Status {
      /**
      * The job has been processed.
      */
      @JsonProperty("DONE")
      DONE,

      /**
      * The job is being processed.
      */
      @JsonProperty("IN_PROGRESS")
      IN_PROGRESS,

      /**
      * The job is waiting to be processed.
      */
      @JsonProperty("PENDING")
      PENDING,
  }
  ```

Additionally, Java code generation supports the following Java-specific options:

- `javaJacksonType` overrides the type that `jtd-codegen` should generate.
  `jtd-codegen` will not generate any code for schemas with `javaJacksonType`,
  and instead use the value of `javaJacksonType` as-is.

  It is your responsibility to ensure that the value of `javaJacksonType` is
  valid code. `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "javaJacksonType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```java
  package com.example;

  import com.fasterxml.jackson.annotation.JsonProperty;
  import com.fasterxml.jackson.databind.annotation.JsonSerialize;

  @JsonSerialize
  public class OverrideDemo {
      @JsonProperty("isAdmin")
      private Boolean isAdmin;

      @JsonProperty("name")
      private String name;

      public OverrideDemo() {
      }

      /**
      * Getter for isAdmin.<p>
      */
      public Boolean getIsAdmin() {
          return isAdmin;
      }

      /**
      * Setter for isAdmin.<p>
      */
      public void setIsAdmin(Boolean isAdmin) {
          this.isAdmin = isAdmin;
      }

      /**
      * Getter for name.<p>
      */
      public String getName() {
          return name;
      }

      /**
      * Setter for name.<p>
      */
      public void setName(String name) {
          this.name = name;
      }
  }
  ```

- `javaJacksonContainer` overrides the type that `jtd-codegen` uses for lists
  and dictionaries. By default, generated code uses `java.util.List` and
  `java.util.Map`, but you can override this with `javaJacksonContainer`.

  It is your responsibility to ensure that the value of `javaJacksonType` is
  valid code. `jtd-codegen` will not attempt to validate its value.

  In particular, you should make sure your chosen type for lists supports
  parameterizing its value (i.e. it should be something that can be invoked as
  `Foo<T>`) and your type for dictionaries supports `String` as its first value,
  and valid `T` for its second value (i.e. it should be something that can be
  invoked as `Foo<String, T>`).

  For example:

  ```json
  {
    "properties": {
      "example_list": {
        "metadata": {
          "javaJacksonContainer": "java.util.LinkedList"
        },
        "elements": {
          "type": "string"
        }
      },
      "example_map": {
        "metadata": {
          "javaJacksonContainer": "java.util.TreeMap"
        },
        "values": {
          "type": "string"
        }
      }
    }
  }
  ```

  Generates into:

  ```java
  package com.example;

  import com.fasterxml.jackson.annotation.JsonProperty;
  import com.fasterxml.jackson.databind.annotation.JsonSerialize;

  @JsonSerialize
  public class ContainerOverrides {
      @JsonProperty("example_list")
      private MyCustomList<String> exampleList;

      @JsonProperty("example_map")
      private MyCustomDictionary<String, String> exampleMap;

      public ContainerOverrides() {
      }

      /**
      * Getter for exampleList.<p>
      */
      public MyCustomList<String> getExampleList() {
          return exampleList;
      }

      /**
      * Setter for exampleList.<p>
      */
      public void setExampleList(MyCustomList<String> exampleList) {
          this.exampleList = exampleList;
      }

      /**
      * Getter for exampleMap.<p>
      */
      public MyCustomDictionary<String, String> getExampleMap() {
          return exampleMap;
      }

      /**
      * Setter for exampleMap.<p>
      */
      public void setExampleMap(MyCustomDictionary<String, String> exampleMap) {
          this.exampleMap = exampleMap;
      }
  }
  ```

## Generated Java code

This section details the sort of Java code that `jtd-codegen` will generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
Java `Object`:

```json
{}
```

Generates into:

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public class Empty {
    @JsonValue
    private Object value;

    public Empty() {
    }

    @JsonCreator
    public Empty(Object value) {
        this.value = value;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Java. In real-world schemas, this doesn't happen very often._

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

```java
// Ref.java
package com.example;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public class Ref {
    @JsonValue
    private Example value;

    public Ref() {
    }

    @JsonCreator
    public Ref(Example value) {
        this.value = value;
    }

    public Example getValue() {
        return value;
    }

    public void setValue(Example value) {
        this.value = value;
    }
}

// Example.java
package com.example;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public class Example {
    @JsonValue
    private String value;

    public Example() {
    }

    @JsonCreator
    public Example(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Java. In real-world schemas, this doesn't happen very often._

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | Java type                  |
| ----------------- | -------------------------- |
| `boolean`         | `Boolean`                  |
| `string`          | `String`                   |
| `timestamp`       | `java.time.OffsetDateTime` |
| `float32`         | `Float`                    |
| `float64`         | `Double`                   |
| `int8`            | `Byte`                     |
| `uint8`           | `UnsignedByte` \*          |
| `int16`           | `Short`                    |
| `uint16`          | `UnsignedShort` \*         |
| `int32`           | `Integer`                  |
| `uint32`          | `UnsignedInteger` \*       |

\* `UnsignedByte`, `UnsignedShort`, and `UnsignedInteger` are
`jtd-codegen`-generated wrapper types around `byte`, `short`, and `int` with
custom Jackson serializer/deserializer implementations, to support an unsigned
range of values.

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

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.time.OffsetDateTime;

@JsonSerialize
public class Type {
    @JsonProperty("boolean")
    private Boolean boolean_;

    @JsonProperty("float32")
    private Float float32;

    @JsonProperty("float64")
    private Double float64;

    @JsonProperty("int16")
    private Short int16;

    @JsonProperty("int32")
    private Integer int32;

    @JsonProperty("int8")
    private Byte int8;

    @JsonProperty("string")
    private String string;

    @JsonProperty("timestamp")
    private OffsetDateTime timestamp;

    @JsonProperty("uint16")
    private UnsignedShort uint16;

    @JsonProperty("uint32")
    private UnsignedInteger uint32;

    @JsonProperty("uint8")
    private UnsignedByte uint8;


    public Type() {
    }

    // getters/setters omitted here for brevity...
}
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
Java enum:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum Enum {
    @JsonProperty("DONE")
    DONE,

    @JsonProperty("IN_PROGRESS")
    IN_PROGRESS,

    @JsonProperty("PENDING")
    PENDING,
}
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted
into a Java `List<T>`, where `T` is the type of the elements of the array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.List;

public class Elements {
    @JsonValue
    private List<String> value;

    public Elements() {
    }

    @JsonCreator
    public Elements(List<String> value) {
        this.value = value;
    }

    public List<String> getValue() {
        return value;
    }

    public void setValue(List<String> value) {
        this.value = value;
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Java. In real-world schemas, this doesn't happen very often._

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a Java POJO / Bean. Optional properties will be annotated with
`@JsonInclude(NON_NULL)`, which means that they will be omitted from JSON if set
to `null`. Allowing "extra" properties will lead to the generated class being
annotated with `@JsonIngoreProperties`:

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

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

@JsonSerialize
@JsonIgnoreProperties(ignoreUnknown = true)
public class Properties {
    @JsonProperty("isAdmin")
    private Boolean isAdmin;

    @JsonProperty("name")
    private String name;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty("middleName")
    private String middleName;

    public Properties() {
    }

    /**
     * Getter for isAdmin.<p>
     */
    public Boolean getIsAdmin() {
        return isAdmin;
    }

    /**
     * Setter for isAdmin.<p>
     */
    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    /**
     * Getter for name.<p>
     */
    public String getName() {
        return name;
    }

    /**
     * Setter for name.<p>
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Getter for middleName.<p>
     */
    public String getMiddleName() {
        return middleName;
    }

    /**
     * Setter for middleName.<p>
     */
    public void setMiddleName(String middleName) {
        this.middleName = middleName;
    }
}
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a Java `Map<String, T>`, where `T` is the type of the values of the object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```java
package com.example;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Map;

public class Values {
    @JsonValue
    private Map<String, String> value;

    public Values() {
    }

    @JsonCreator
    public Values(Map<String, String> value) {
        this.value = value;
    }

    public Map<String, String> getValue() {
        return value;
    }

    public void setValue(Map<String, String> value) {
        this.value = value;
    }
}
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Java. In real-world schemas, this doesn't happen very often._

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into an abstract class, and each mapping will be a concrete
implementation of that class. The abstract class is annotated with
`@JsonTypeInfo` and `@JsonSubTypes`, so Jackson will know how to use the "tag"
property to figure out which instance to create:

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

```java
// Discriminator.java
package com.example;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "eventType")
@JsonSubTypes({
    @JsonSubTypes.Type(name = "USER_CREATED", value = DiscriminatorUserCreated.class),
    @JsonSubTypes.Type(name = "USER_DELETED", value = DiscriminatorUserDeleted.class),
    @JsonSubTypes.Type(name = "USER_PAYMENT_PLAN_CHANGED", value = DiscriminatorUserPaymentPlanChanged.class),
})
public abstract class Discriminator {
}

// DiscriminatorUserCreated.java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

@JsonSerialize
public class DiscriminatorUserCreated extends Discriminator {
    @JsonProperty("id")
    private String id;

    public DiscriminatorUserCreated() {
    }

    /**
     * Getter for id.<p>
     */
    public String getId() {
        return id;
    }

    /**
     * Setter for id.<p>
     */
    public void setId(String id) {
        this.id = id;
    }
}

// DiscriminatorUserPaymentPlanChanged.java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

@JsonSerialize
public class DiscriminatorUserPaymentPlanChanged extends Discriminator {
    @JsonProperty("id")
    private String id;

    @JsonProperty("plan")
    private DiscriminatorUserPaymentPlanChangedPlan plan;

    public DiscriminatorUserPaymentPlanChanged() {
    }

    /**
     * Getter for id.<p>
     */
    public String getId() {
        return id;
    }

    /**
     * Setter for id.<p>
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * Getter for plan.<p>
     */
    public DiscriminatorUserPaymentPlanChangedPlan getPlan() {
        return plan;
    }

    /**
     * Setter for plan.<p>
     */
    public void setPlan(DiscriminatorUserPaymentPlanChangedPlan plan) {
        this.plan = plan;
    }
}

// DiscriminatorUserPaymentPlanChangedPlan.java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum DiscriminatorUserPaymentPlanChangedPlan {
    @JsonProperty("FREE")
    FREE,

    @JsonProperty("PAID")
    PAID,
}

// DiscriminatorUserDeleted.java
package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

@JsonSerialize
public class DiscriminatorUserDeleted extends Discriminator {
    @JsonProperty("id")
    private String id;

    @JsonProperty("softDelete")
    private Boolean softDelete;

    public DiscriminatorUserDeleted() {
    }

    /**
     * Getter for id.<p>
     */
    public String getId() {
        return id;
    }

    /**
     * Setter for id.<p>
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * Getter for softDelete.<p>
     */
    public Boolean getSoftDelete() {
        return softDelete;
    }

    /**
     * Setter for softDelete.<p>
     */
    public void setSoftDelete(Boolean softDelete) {
        this.softDelete = softDelete;
    }
}
```
