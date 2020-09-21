---
title: "Validating JSON in Python with JSON Typedef"
sidebar_label: "Validation"
---

JSON Typedef is a schema language for JSON: it lets you describe the shape of
your JSON data in a portable way, and from that you can validate data and
generate datatypes from your schemas.

This article will explain how you can validate JSON using JSON Typedef in
Python.

If you're unfamiliar with the syntax of JSON Typedef schemas, you may want to
first read ["Learn JSON Typedef"](getting-started/learn-json-typedef.md). That
said, JSON Typedef is pretty straightfoward, and you can probably guess what
most schemas in this article do without consulting that article.

## Step 1: Install the `jtd` package

The recommended Python implementation of JSON Typedef is [the `jtd`
package][jtd-gh]. In a new directory, run:

```bash
pip install jtd
```

Right away, we can test out `jtd`, by starting up a Python REPL with `python3`:

```text
>>> import jtd
>>> schema = jtd.Schema.from_dict({ 'type': 'string' })
>>> jtd.validate(schema=schema, instance='hello, world!')
[]
```

The `jtd.validate` function returns an array of validation errors. But if you
validate `"hello, world!"` against the JSON Typedef schema `{ "type":
"string" }`, there are no validation errors -- the data is ok! So `jtd.validate`
returns an empty array.

Let's try out some invalid data:

```text
>>> jtd.validate(schema=schema, instance=42)
[ValidationError(instance_path=[], schema_path=['type'])]
```

This time, `jtd.validate` gave us back an array with one element inside of it.
Every element of the array `jtd.validate` will always have two properties:

* `instance_path` will "point to" the part of the data that had a validation
  error, and
* `schema_path` will "point to" the part of the schema that raised the
  validation error.

In this case, `instance_path` isn't very useful -- but it will become more
useful when we start validating more complicated inputs. `schema_path` already
is making some sense: it tells us that the `type` keyword was upset with the
input. Which makes sense: `type: string` expects a string, but we gave it a
number.

## Step 2: Integrating `jtd` into your application

Already, it should be pretty clear that `jtd.validate` is the main function
you'll want to use from the `jtd` package. Now, let's explore a way you can
integrate `jtd` into your application.

For the rest of this article, we're going to assume you're writing some sort of
HTTP server. We'll use [Flask](https://flask.palletsprojects.com/), but nothing
about `jtd` is limited to Flask or HTTP in particular. You can use `jtd`
anywhere you can use JSON.

To make things simple, here's a minimal HTTP server with Flask:

```python
# app.py
from flask import Flask, request
app = Flask(__name__)

# Sort of a silly example, but the core of what's going on here is probably
# similar to apps you've written before: you accept some JSON over HTTP, and
# then do some processing of certain properties of that input.
@app.route('/', methods=['POST'])
def index():
    person = request.json

    sum = 0
    for favorite_number in person['favoriteNumbers']:
        sum += favorite_number

    return f"{person['name']}'s favorite numbers add up to {sum}"
```

Run this with `python3 -m flask run`, and then you can test it right away:

```bash
curl localhost:5000 -d '{ "name": "John Doe", "favoriteNumbers": [1, 3.14, 42] }' -H "Content-Type: application/json"
```

```text
John Doe's favorite numbers add up to 46.14
```

But what if someone inputs a string instead of a number? Let's change `3.14` to
`"3.14"`:

```bash
curl localhost:5000 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json"
```

The application crashes! In the logs, we see:

```text
TypeError: unsupported operand type(s) for +=: 'int' and 'str'
```

Fixing this with `jtd` is as simple as calling `jtd.validate` before you attempt
to do any processing of the data. Here's how you can do that:

```python
from flask import Flask, request
import jtd # new: we import jtd

# New: we define the schema of the data we want to accept.
schema = jtd.Schema.from_dict({
    'properties': {
        'name': { 'type': 'string' },
        'favoriteNumbers': {
            'elements': { 'type': 'float64' }
        }
    }
})

app = Flask(__name__)

@app.route('/', methods=['POST'])
def index():
    person = request.json

    # New: we call jtd.validate with our schema (defined above), and make sure
    # the input is valid.
    validation_errors = jtd.validate(schema=schema, instance=person)
    if validation_errors:
        # If there were validation errors, we refuse to process the message.
        return "Validation errors", 400

    # There were no validation errors. We can process the message safely.
    sum = 0
    for favorite_number in person['favoriteNumbers']:
        sum += favorite_number

    return f"{person['name']}'s favorite numbers add up to {sum}"
```

Now if we try the same `3.14` changed to `"3.14"`, we get a validation error
instead of a nonsensical response:

```bash
curl localhost:5000 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json"
```

```text
Validation errors
```

Of course, that's not the most helpful response. In the next section, we'll see
how we can give our API consumers more useful validation messages.

## Step 3: Returning standardized errors

Part of the JSON Typedef specification is the exact set of validation errors
that every implementation returns. That means we can give our users specific
validation errors, without worrying about lock-in with any particular
implementation of JSON Typedef.

To do that, we just need to change this code in our previous example:

```python
validation_errors = jtd.validate(schema=schema, instance=person)
if validation_errors:
    # If there were validation errors, we refuse to process the message.
    return "Validation errors", 400
```

Into:

```python
validation_errors = jtd.validate(schema=schema, instance=person)
if validation_errors:
    # If there were validation errors, we refuse to process the message.
    #
    # We'll send back each validation error we got back from JSON Typedef
    # validation.
    return { 'validationErrors': validation_errors }, 400
```

So now, we get a specific, detailed error message telling us where the error was
in our request, and what part of the schema rejected the input:

```bash
# Note: we here pipe `curl` into `jq`, a tool which will pretty-print JSON.
curl localhost:5000 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json" | jq
```

```json
{
  "validationErrors": [
    {
      "instance_path": [
        "favoriteNumbers",
        "1"
      ],
      "schema_path": [
        "properties",
        "favoriteNumbers",
        "elements",
        "type"
      ]
    }
  ]
}
```

If you prefer to have a terser output than having every path segment split out
into its own element in an array, you can consider using a [JSON
Pointer](https://tools.ietf.org/html/rfc6901), a standardized way to do "paths"
for JSON.

JSON Pointer is dirt-simple to implement. Just add this function:

```python
def to_json_pointer(arr):
    if not arr:
        return ''

    # This ~0 and ~1 stuff is related to how JSON Pointer escapes "/" and "~".
    return '/' + '/'.join([s.replace('~', '~0').replace('/', '~1') for s in arr])
```

And then, instead of returning:

```python
return { 'validationErrors': validation_errors }, 400
```

Return instead:

```python
return {
    'validationErrors': [{
        'instancePath': to_json_pointer(e.instance_path),
        'schemaPath': to_json_pointer(e.schema_path),
    } for e in validation_errors],
}, 400
```

And now you'll get some terser error messages, which might be easier to
understand:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json" | jq
```

```json
{
  "validationErrors": [
    {
      "instancePath": "/favoriteNumbers/1",
      "schemaPath": "/properties/favoriteNumbers/elements/type"
    }
  ]
}
```

## Advanced usage

This section discusses some fancier use-cases you can implement with `jtd`.

### Limiting errors returned

By default, `jtd.validate` returns every error it finds. If you just care about
whether there are any errors at all, or if you can't show more than some number
of errors, then you can get better performance out of `jtd.validate` using the
`max_errors` option.

For example, we can take the previous example, but only every return at most one
error, by changing:

```python
validation_errors = jtd.validate(schema=schema, instance=person)
```

Into:

```python
options = jtd.ValidationOptions(max_errors=1)
validation_errors = jtd.validate(schema=schema, instance=person, options=options)
```

### Handling untrusted schemas

If you're interested in using `jtd` to handle untrusted schemas -- for example,
if you're trying to validate data against a schema that you didn't write, then
you should take extra precautions to avoid Denial-of-Service attacks.

See ["Advanced Usage: Handling Untrusted Schemas"][jtd-gh-untrusted-schemas] in
the `jtd` README on GitHub for how you can safely handle untrusted schemas.

[jtd-gh]: https://github.com/jsontypedef/json-typedef-python
[jtd-gh-untrusted-schemas]:
https://github.com/jsontypedef/json-typedef-python#advanced-usage-handling-untrusted-schemas
