---
title: Generating Python from JSON Typedef schemas
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can use JSON Typedef to generate Python code from
schemas. If you're interested in generating code in other languages, see [this
article on `jtd-codegen`](/docs/jtd-codegen). The rest of this article focuses
on using `jtd-codegen` with Python in particular.

## Generating Python with `jtd-codegen`

As a prerequisite, you need to first install `jtd-codegen`. Installation
instructions are available [here](/docs/jtd-codegen#installing-jtd-codegen).

You can generate Python with `jtd-codegen` using the `--python-out` option,
whose value must be a directory that `jtd-codegen` can generate code into.

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

Then you can generate Python code into the `src/user` directory by running:

```bash
jtd-codegen schemas/user.jtd.json --python-out src/user
```

Which will output something like:

```text
📝 Writing Python code to: src/user
📦 Generated Python code.
📦     Root schema converted into type: User
```

And you should see code along these lines in `src/user/__init.py__`:

```py
from dataclasses import dataclass
from typing import Any, Optional, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class User:
    created_at: 'str'
    id: 'str'
    is_admin: 'bool'
    karma: 'int'

    @classmethod
    def from_json(cls, data) -> 'User':
        return cls(
            _from_json(str, data.get("createdAt")),
            _from_json(str, data.get("id")),
            _from_json(bool, data.get("isAdmin")),
            _from_json(int, data.get("karma")),
        )

    def to_json(self):
        data = {}
        data["createdAt"] = _to_json(self.created_at)
        data["id"] = _to_json(self.id)
        data["isAdmin"] = _to_json(self.is_admin)
        data["karma"] = _to_json(self.karma)
        return data
```

Note: at the time of writing, generated code is not always formatted in a
pretty way. If you require pretty-formatted code, it's recommended that you use
a code formatter on `jtd-codegen`-generated code.

## Using generated Python code

`jtd-codegen` will always output code into a `__init__.py` inside the directory
you specify with `--python-out`. In the previous example, we outputted code into
`src/user`, so we can import it like so:

```python
from .user import User
```

The generated Python code does not presume a particular JSON implementation. You
can use `jtd-codegen`-generated types with [the standard library's
`json`](https://docs.python.org/3/library/json.html) module, or you can use
alternatives like [`orjson`](https://github.com/ijl/orjson) or
[`simplejson`](https://github.com/simplejson/simplejson).

The generated code is JSON-library independent because every generated class or
enum has a `from_json` and `to_json` method. `from_json` takes in already-parsed
JSON data, such as data returned from `json.loads`, and returns an instance of
the type. `to_json` does the reverse, constructing data that you can pass to
`json.dumps`.

Do not directly pass instances of `jtd-codegen`-generated types to JSON
libraries. You will get the wrong JSON result if you do this. Always pass
through `from_json` or `to_json` first.

Here's an example of you'd use the `User` class we imported above:

```py
import json

# To read in JSON, assuming you know the JSON is valid, do something like:
input_json = '...'
user = User.from_json(json.loads(input_json))

# To write out JSON, do something like:
output_json = json.dumps(user.to_json())
```

In the example above, we directly use `from_json` on parse JSON data. This will
only work correctly if the JSON input is valid. Otherwise, you may encounter
runtime exceptions, and the types of the class's attributes may be different
from those indicated on their type annotations. If you do run into runtime
exceptions, these exceptions will be Python-specific and low-level.

To prevent this from happening, you should first validate the JSON input using a
JTD validation implementation, such as [the `jtd`
package](https://github.com/jsontypedef/json-typedef-python). What you would do
is:

1. Parse the input using your preferred JSON backend.
2. Validate that the parsed JSON is valid against the schema you
   generated your types from, using a JTD validation implementation. If there
   are validation errors, you can return those, because JTD validation errors
   are standardized and platform-independent.
3. If the input is valid, then construct an instance of your generated type
   using its `from_json` method. Pass in the JSON you just validated to
   `from_json`.

This solution lets you produce portable validation errors and lets you be more
deliberate about what inputs you do and don't accept.

## Customizing Python output

Python code generation supports the following metadata properties shared across
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

  ```py
  @dataclass
  class User:
      """
      A user in our system
      """

      is_admin: 'bool'
      """
      Whether the user is an admin
      """

      name: 'str'
      """
      The user's name
      """


      @classmethod
      def from_json(cls, data) -> 'User':
          return cls(
              _from_json(bool, data.get("isAdmin")),
              _from_json(str, data.get("name")),
          )

      def to_json(self):
          data = {}
          data["isAdmin"] = _to_json(self.is_admin)
          data["name"] = _to_json(self.name)
          return data
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

  ```py
  class Status(Enum):
      DONE = "DONE"
      """
      The job has been processed.
      """

      IN_PROGRESS = "IN_PROGRESS"
      """
      The job is being processed.
      """

      PENDING = "PENDING"
      """
      The job is waiting to be processed.
      """

      @classmethod
      def from_json(cls, data) -> 'Status':
          return cls(data)

      def to_json(self):
          return self.value
  ```

Additionally, Python code generation supports the following Python-specific
options:

- `pythonType` overrides the type that `jtd-codegen` should generate.
  `jtd-codegen` will not generate any code for schemas with `pythonType`, and
  instead use the value of `pythonType` as-is.

  It is your responsibility to ensure that the value of `pythonType` is valid
  code. `jtd-codegen` will not attempt to validate its value.

  For example, this schema:

  ```json
  {
    "properties": {
      "name": { "type": "string" },
      "isAdmin": {
        "metadata": {
          "pythonType": "MyCustomType"
        },
        "type": "boolean"
      }
    }
  }
  ```

  Generates into:

  ```py
    @dataclass
    class OverrideDemo:
        is_admin: 'bool'
        name: 'str'

        @classmethod
        def from_json(cls, data) -> 'OverrideDemo':
            return cls(
                _from_json(bool, data.get("isAdmin")),
                _from_json(str, data.get("name")),
            )

        def to_json(self):
            data = {}
            data["isAdmin"] = _to_json(self.is_admin)
            data["name"] = _to_json(self.name)
            return data
  ```

## Generated Python code

This section details the sort of Python code that `jtd-codegen` will generate.

### Code generated from "Empty" schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will be converted into a
Python `typing.Any`:

```json
{}
```

Generates into:

```py
from dataclasses import dataclass
from typing import Any, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Empty:
    value: 'Any'

    @classmethod
    def from_json(cls, data) -> 'Empty':
        return cls(_from_json(Any, data))

    def to_json(self):
        return _to_json(self.value)
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Python. In real-world schemas, this doesn't happen very often._

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

```py
from dataclasses import dataclass
from typing import Any, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Ref:
    value: 'Example'

    @classmethod
    def from_json(cls, data) -> 'Ref':
        return cls(_from_json(Example, data))

    def to_json(self):
        return _to_json(self.value)

@dataclass
class Example:
    value: 'str'

    @classmethod
    def from_json(cls, data) -> 'Example':
        return cls(_from_json(str, data))

    def to_json(self):
        return _to_json(self.value)
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Python. In real-world schemas, this doesn't happen very often._

### Code generated from "Type" schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will be converted into
the following types:

| JSON Typedef type | Python type |
| ----------------- | ----------- |
| `boolean`         | `bool`      |
| `string`          | `str`       |
| `timestamp`       | `str`       |
| `float32`         | `float`     |
| `float64`         | `float`     |
| `int8`            | `int`       |
| `uint8`           | `int`       |
| `int16`           | `int`       |
| `uint16`          | `int`       |
| `int32`           | `int`       |
| `uint32`          | `int`       |

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

```py
from dataclasses import dataclass
from typing import Any, Optional, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Type:
    boolean: 'bool'
    float32: 'float'
    float64: 'float'
    int16: 'int'
    int32: 'int'
    int8: 'int'
    string: 'str'
    timestamp: 'str'
    uint16: 'int'
    uint32: 'int'
    uint8: 'int'

    @classmethod
    def from_json(cls, data) -> 'Type':
        return cls(
            _from_json(bool, data.get("boolean")),
            _from_json(float, data.get("float32")),
            _from_json(float, data.get("float64")),
            _from_json(int, data.get("int16")),
            _from_json(int, data.get("int32")),
            _from_json(int, data.get("int8")),
            _from_json(str, data.get("string")),
            _from_json(str, data.get("timestamp")),
            _from_json(int, data.get("uint16")),
            _from_json(int, data.get("uint32")),
            _from_json(int, data.get("uint8")),
        )

    def to_json(self):
        data = {}
        data["boolean"] = _to_json(self.boolean)
        data["float32"] = _to_json(self.float32)
        data["float64"] = _to_json(self.float64)
        data["int16"] = _to_json(self.int16)
        data["int32"] = _to_json(self.int32)
        data["int8"] = _to_json(self.int8)
        data["string"] = _to_json(self.string)
        data["timestamp"] = _to_json(self.timestamp)
        data["uint16"] = _to_json(self.uint16)
        data["uint32"] = _to_json(self.uint32)
        data["uint8"] = _to_json(self.uint8)
        return data
```

### Code generated from "Enum" schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will be converted into a
Python class that extends `Enum`:

```json
{
  "enum": ["PENDING", "IN_PROGRESS", "DONE"]
}
```

Generates into:

```py
from enum import Enum
from typing import Any, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

class Enum(Enum):
    DONE = "DONE"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"

    @classmethod
    def from_json(cls, data) -> 'Enum':
        return cls(data)

    def to_json(self):
        return self.value
```

### Code generated from "Elements" schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will be converted
into a Python `typing.List[T]`, where `T` is the type of the elements of the
array:

```json
{
  "elements": {
    "type": "string"
  }
}
```

Generates into:

```py
from dataclasses import dataclass
from typing import Any, List, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Elements:
    value: 'List[str]'

    @classmethod
    def from_json(cls, data) -> 'Elements':
        return cls(_from_json(List[str], data))

    def to_json(self):
        return _to_json(self.value)
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Python. In real-world schemas, this doesn't happen very often._

### Code generated from "Properties" schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) will be
converted into a Python `@dataclass`. Optional properties will be marked with
`typing.Optional`, and will be omitted from JSON if set to `None`.

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

```py
from dataclasses import dataclass
from typing import Any, Optional, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Properties:
    is_admin: 'bool'
    name: 'str'
    middle_name: 'Optional[str]'

    @classmethod
    def from_json(cls, data) -> 'Properties':
        return cls(
            _from_json(bool, data.get("isAdmin")),
            _from_json(str, data.get("name")),
            _from_json(Optional[str], data.get("middleName")),
        )

    def to_json(self):
        data = {}
        data["isAdmin"] = _to_json(self.is_admin)
        data["name"] = _to_json(self.name)
        if self.middle_name is not None:
             data["middleName"] = _to_json(self.middle_name)
        return data
```

### Code generated from "Values" schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will be converted into
a Python `typing.Dict[str, T]`, where `T` is the type of the values of the
object:

```json
{
  "values": {
    "type": "string"
  }
}
```

Generates into:

```py
from dataclasses import dataclass
from typing import Any, Dict, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Values:
    value: 'Dict[str, str]'

    @classmethod
    def from_json(cls, data) -> 'Values':
        return cls(_from_json(Dict[str, str], data))

    def to_json(self):
        return _to_json(self.value)
```

_Note: `jtd-codegen` had to generate a custom type alias here, which is why the
code has a bit of extra stuff. If you use "empty", "type", "ref", "elements", or
"values" schemas at the top level of a schema, `jtd-codegen` has to emit type
aliases in Python. In real-world schemas, this doesn't happen very often._

### Code generated from "Discriminator" schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#values-schemas) will be
converted into a Python `@dataclass`, and each mapping will be a Python
`@dataclass` that extends the discriminator:

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

```py
from dataclasses import dataclass
from enum import Enum
from typing import Any, Union, get_args, get_origin

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()

@dataclass
class Discriminator:
    event_type: 'str'

    @classmethod
    def from_json(cls, data) -> 'Discriminator':
        return {
            "USER_CREATED": DiscriminatorUserCreated,
            "USER_DELETED": DiscriminatorUserDeleted,
            "USER_PAYMENT_PLAN_CHANGED": DiscriminatorUserPaymentPlanChanged,
        }[data["eventType"]].from_json(data)

    def to_json(self):
        pass

@dataclass
class DiscriminatorUserCreated(Discriminator):
    id: 'str'

    @classmethod
    def from_json(cls, data) -> 'DiscriminatorUserCreated':
        return cls(
            "USER_CREATED",
            _from_json(str, data.get("id")),
        )

    def to_json(self):
        data = { "eventType": "USER_CREATED" }
        data["id"] = _to_json(self.id)
        return data

@dataclass
class DiscriminatorUserDeleted(Discriminator):
    id: 'str'
    soft_delete: 'bool'

    @classmethod
    def from_json(cls, data) -> 'DiscriminatorUserDeleted':
        return cls(
            "USER_DELETED",
            _from_json(str, data.get("id")),
            _from_json(bool, data.get("softDelete")),
        )

    def to_json(self):
        data = { "eventType": "USER_DELETED" }
        data["id"] = _to_json(self.id)
        data["softDelete"] = _to_json(self.soft_delete)
        return data

class DiscriminatorUserPaymentPlanChangedPlan(Enum):
    FREE = "FREE"
    PAID = "PAID"
    @classmethod
    def from_json(cls, data) -> 'DiscriminatorUserPaymentPlanChangedPlan':
        return cls(data)

    def to_json(self):
        return self.value

@dataclass
class DiscriminatorUserPaymentPlanChanged(Discriminator):
    id: 'str'
    plan: 'DiscriminatorUserPaymentPlanChangedPlan'

    @classmethod
    def from_json(cls, data) -> 'DiscriminatorUserPaymentPlanChanged':
        return cls(
            "USER_PAYMENT_PLAN_CHANGED",
            _from_json(str, data.get("id")),
            _from_json(DiscriminatorUserPaymentPlanChangedPlan, data.get("plan")),
        )

    def to_json(self):
        data = { "eventType": "USER_PAYMENT_PLAN_CHANGED" }
        data["id"] = _to_json(self.id)
        data["plan"] = _to_json(self.plan)
        return data
```
