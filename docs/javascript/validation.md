---
title: "Validating JSON in JavaScript with JSON Typedef"
sidebar_label: "Validation"
---

> This article is about JSON Typedef *validation* with JavaScript / TypeScript.
> If instead you're interested in JSON Typedef *code generation* with
> TypeScript, see the next article, ["Generating TypeScript from JSON Typedef
> Schemas"](javascript/code-generation.md).

JSON Typedef is a schema language for JSON: it lets you describe the shape of
your JSON data in a portable way, and from that you can validate data and
generate datatypes from your schemas.

This article will explain how you can validate JSON using JSON Typedef in
JavaScript. Everything in this article is relevant to both JS running in Node.js
or JS running in the browser.

If you're unfamiliar with the syntax of JSON Typedef schemas, you may want to
first read ["Learn JSON Typedef"](getting-started/learn-json-typedef.md). That
said, JSON Typedef is pretty straightfoward, and you can probably guess what
most schemas in this article do without consulting that article.

## Step 1: Install the `jtd` package

The recommended JavaScript implementation of JSON Typedef is [the `jtd`
package][jtd-gh]. In a new directory, run:

```bash
# This article will use `npm`, but you can use `yarn` if you prefer.
npm install jtd
```

Right away, we can test out `jtd`, by starting up a Node console with `node`:

```text
$ node
> const jtd = require("jtd")
undefined
> jtd.validate({ type: "string" }, "hello, world!")
[]
```

The `jtd.validate` function returns an array of validation errors. But if you
validate `"hello, world!"` against the JSON Typedef schema `{ "type":
"string" }`, there are no validation errors -- the data is ok! So `jtd.validate`
returns an empty array.

Let's try out some invalid data:

```text
> jtd.validate({ type: "string" }, 42)
[ { instancePath: [], schemaPath: [ 'type' ] } ]
```

This time, `jtd.validate` gave us back an array with one element inside of it.
Every element of the array `jtd.validate` will always have two properties:

* `instancePath` will "point to" the part of the data that had a validation
  error, and
* `schemaPath` will "point to" the part of the schema that raised the validation
  error.

In this case, `instancePath` isn't very useful -- but it will become more useful
when we start validating more complicated inputs. `schemaPath` already is making
some sense: it tells us that the `type` keyword was upset with the input. Which
makes sense: `type: string` expects a string, but we gave it a number.

## Step 2: Integrating `jtd` into your application

Already, it should be pretty clear that `jtd.validate` is the main function
you'll want to use from the `jtd` package. Now, let's explore a way you can
integrate `jtd` into your application.

For the rest of this article, we're going to assume you're writing some sort of
HTTP server. We'll use [Express](https://expressjs.com/), but nothing about
`jtd` is limited to Express or HTTP in particular. You can use `jtd` anywhere
you can use JSON.

To make things simple, here's a minimal HTTP server with Express:

```js
// server.js
const express = require("express")

const app = express()
app.use(express.json())

// Sort of a silly example, but the core of what's going on here is probably
// similar to apps you've written before: you accept some JSON over HTTP, and
// then do some processing of certain properties of that input.
app.post("/", (req, res) => {
  const person = req.body;

  let sum = 0;
  for (const favoriteNumber of person.favoriteNumbers) {
    sum += favoriteNumber;
  }

  res.send(`${person.name}'s favorite numbers add up to ${sum}`)
})

app.listen(8080)
```

Run this with `node server.js`, and then you can test it right away:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, 3.14, 42] }' -H "Content-Type: application/json"
```

```text
John Doe's favorite numbers add up to 46.14
```

But what if someone inputs a string instead of a number? Let's change `3.14` to
`"3.14"`:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json"
```

```text
John Doe's favorite numbers add up to 13.1442
```

Whoops! Our application does the wrong thing. It could be worse: if the input
doesn't have `favoriteNumbers` at all, we'll crash altogether.

Fixing this with `jtd` is as simple as calling `jtd.valiate` before you attempt
to do any processing of the data. Here's how you can do that:

```js
const express = require("express")
const jtd = require("jtd") // new: we import jtd

// New: we define the schema of the data we want to accept.
const schema = {
  properties: {
    name: { type: "string" },
    favoriteNumbers: {
      elements: { type: "float64" }
    }
  }
}

const app = express()
app.use(express.json())

app.post("/", (req, res) => {
  const person = req.body;

  // New: we call jtd.validate with our schema (defined above), and make sure
  // the input is valid.
  const validationErrors = jtd.validate(schema, person)
  if (validationErrors.length !== 0) {
    // If there were validation errors, we refuse to process the message.
    return res.status(400).send("Validation errors")
  }

  // There we no validation errors. We can process the message safely.
  let sum = 0;
  for (const favoriteNumber of person.favoriteNumbers) {
    sum += favoriteNumber;
  }

  res.send(`${person.name}'s favorite numbers add up to ${sum}`)
})

app.listen(8080)
```

Now if we try the same `3.14` changed to `"3.14"`, we get a validation error
instead of a nonsensical response:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json"
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

```js
const validationErrors = jtd.validate(schema, person)
if (validationErrors.length !== 0) {
  // If there were validation errors, we refuse to process the message.
  return res.status(400).send("Validation errors")
}
```

Into:

```js
const validationErrors = jtd.validate(schema, person)
if (validationErrors.length !== 0) {
  // If there were validation errors, we refuse to process the message.
  //
  // We'll send back each validation error we got back from JSON Typedef
  // validation.
  return res.status(400).send({ validationErrors })
}
```

So now, we get a specific, detailed error message telling us where the error was
in our request, and what part of the schema rejected the input:

```bash
# Note: we here pipe `curl` into `jq`, a tool which will pretty-print JSON.
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json" | jq
```

```json
{
  "validationErrors": [
    {
      "instancePath": [
        "favoriteNumbers",
        "1"
      ],
      "schemaPath": [
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

```js
function toJSONPointer(arr) {
  if (arr.length === 0) {
    return ""
  }

  // This ~0 and ~1 stuff is related to how JSON Pointer escapes "/" and "~".
  return "/" + arr.map(token => token.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")
}
```

And then, instead of returning:

```js
return res.status(400).send({ validationErrors })
```

Return instead:

```js
return res.status(400).send({
  validationErrors: validationErrors.map(err => ({
    instancePath: toJSONPointer(err.instancePath),
    schemaPath: toJSONPointer(err.schemaPath),
  }))
})
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
`maxErrors` option.

For example, we can take the previous example, but only every return at most one
error, by changing:

```js
const validationErrors = jtd.validate(schema, person)
```

Into:

```js
const validationErrors = jtd.validate(schema, person, { maxErrors: 1 })
```

### Handling untrusted schemas

If you're interested in using `jtd` to handle untrusted schemas -- for example,
if you're trying to validate data against a schema that you didn't write, then
you should take extra precautions to avoid Denial-of-Service attacks.

See ["Advanced Usage: Handling Untrusted Schemas"][jtd-gh-untrusted-schemas] in
the `jtd` README on GitHub for how you can safely handle untrusted schemas.

## Integrating with TypeScript

If you're using `jtd` with TypeScript, you'll want to make a few changes from
the examples given in this repo.

Instead of importing `jtd` as:

```js
const jtd = require("jtd")

jtd.validate(...)
```

You should write:

```ts
import { validate } from "jtd";

validate(...);
```

As you can see in [the TypeDocs for `validate`][typedocs-validate], the first
argument in TypeScript needs to be a [`Schema`][typedocs-schema]. But if you put
your `Schema` in a variable, and then pass that variable into `validate`, like
this:

```ts
import { validate } from "jtd";

const schema = {
  properties: {
    name: { type: "string" },
    favoriteNumbers: {
      elements: { type: "float64" }
    }
  }
}

validate(schema, { name: "foo" });
```

You'll get an error from TypeScript like this:

```text
foo.ts:12:10 - error TS2345: Argument of type '{ properties: { name: { type: string; }; favoriteNumbers: { elements: { type: string; }; }; }; }' is not assignable to parameter of type 'Schema'.
  Type '{ properties: { name: { type: string; }; favoriteNumbers: { elements: { type: string; }; }; }; }' is not assignable to type 'SharedFormProperties & { properties: { [name: string]: Schema; }; optionalProperties?: { [name: string]: Schema; }; additionalProperties?: boolean; }'.
    Type '{ properties: { name: { type: string; }; favoriteNumbers: { elements: { type: string; }; }; }; }' is not assignable to type '{ properties: { [name: string]: Schema; }; optionalProperties?: { [name: string]: Schema; }; additionalProperties?: boolean; }'.
      Types of property 'properties' are incompatible.
        Type '{ name: { type: string; }; favoriteNumbers: { elements: { type: string; }; }; }' is not assignable to type '{ [name: string]: Schema; }'.
          Property 'name' is incompatible with index signature.
            Type '{ type: string; }' is not assignable to type 'Schema'.
              Type '{ type: string; }' is not assignable to type 'SchemaFormType'.
                Type '{ type: string; }' is not assignable to type '{ type: Type; }'.
                  Types of property 'type' are incompatible.
                    Type 'string' is not assignable to type 'Type'.

12 validate(schema, { name: "foo" });
```

That's a symptom of the fact that TypeScript doesn't automatically infer
specific types for string literals. The recommended solution for this is to use
a cast:

```ts
import { Schema, validate } from "jtd";

const schema = {
  properties: {
    name: { type: "string" },
    favoriteNumbers: {
      elements: { type: "float64" }
    }
  }
} as Schema

validate(schema, { name: "foo" });
```

If you're concerned that you might make a typo in writing out your schema, you
can consider using [`isSchema`][typedocs-isschema] and
[`isValidSchema`][typedocs-isvalidschema] in whatever way makes sense for your
application.

[jtd-gh]: https://github.com/jsontypedef/json-typedef-js
[jtd-gh-untrusted-schemas]: https://github.com/jsontypedef/json-typedef-js#advanced-usage-handling-untrusted-schemas
[typedocs-validate]: https://jsontypedef.github.io/json-typedef-js/modules/_validate_.html#validate
[typedocs-schema]: https://jsontypedef.github.io/json-typedef-js/modules/_schema_.html#schema
[typedocs-isschema]: https://jsontypedef.github.io/json-typedef-js/modules/_schema_.html#isschema
[typedocs-isvalidschema]: https://jsontypedef.github.io/json-typedef-js/modules/_schema_.html#isvalidschema
