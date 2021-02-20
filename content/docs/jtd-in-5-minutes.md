---
title: Learn JSON Typedef in 5 Minutes
---

This article is a tutorial that will teach you everything you need to know to
understand any JSON Type Definition schema.

If you're the sort of person who really loves extreme specificity and/or
standards-ese, you may find [RFC 8927](https://tools.ietf.org/html/rfc8927),
where JTD is formally defined, to be interesting. But for most folks, this
tutorial will be easier to understand.

Let's get started!

## What is a JSON Type Definition schema?

JSON Type Definition (aka "JSON Typedef", or just "JTD") schemas are just JSON
documents. Here is a JTD schema:

```json
{
    "properties": {
        "name": { "type": "string" },
        "isAdmin": { "type": "boolean" }
    }
}
```

You might also see schemas written as YAML instead, for example:

```yaml
properties:
    name:
        type: string
    isAdmin:
        type: boolean
```

Technically, only the JSON representation of a schema is valid. But writing
schemas in YAML, and then converting them to JSON at the last minute, is a
pretty common practice.

Schemas can take on one of eight forms. You know which form a schema is using
based on what keywords are in the schema. The eight forms are:

* The [empty form](#empty-schemas) is like a Java `Object` or TypeScript `any`.
* The [type form](#type-schemas) is like a Java or TypeScript primitive type.
* The [enum form](#enum-schemas) is like a Java or TypeScript enum.
* The [elements form](#elements-schemas) is like a Java `List<T>` or TypeScript
  `T[]`.
* The [properties form](#properties-schemas) is like a Java class or TypeScript
  interface.
* The [values form](#values-schemas) is like a Java `Map<String, T>` or
  TypeScript `{ [key: string]: T}`.
* The [discriminator form](#discriminator-schemas) is like a tagged union.
* The [ref form](#ref-schemas) is for re-using schemas, usually so you can avoid
  repeating yourself.

Schemas have to be exactly one of these forms. You can't mix keywords from one
form with keywords from another.

## "Empty" schemas

Here's a valid schema:

```json
{}
```

This is an "empty" schema. It accepts any JSON value, and rejects nothing.

## "Type" schemas

You can use `type` in a schema to specify that something is a primitive JSON
value. For example,

```json
{ "type": "boolean" }
```

Accepts `true` or `false`, and rejects everything else.

Here are all the values you can put for `type`:

| Value of `type` | What it accepts | Example |
| --- | --- | --- |
| `boolean` | `true` or `false` | `true` |
| `string` | JSON strings | `"foo"` |
| `timestamp` | JSON strings containing an [RFC3339 timestamp](https://tools.ietf.org/html/rfc3339) | `"1985-04-12T23:20:50.52Z"` |
| `float32` | JSON numbers | `3.14` |
| `float64` | JSON numbers | `3.14` |
| `int8` | Whole JSON numbers that fit in a signed 8-bit integer | `127` |
| `uint8` | Whole JSON numbers that fit in an unsigned 8-bit integer | `255` |
| `int16` | Whole JSON numbers that fit in a signed 16-bit integer | `32767` |
| `uint16` | Whole JSON numbers that fit in an unsigned 16-bit integer | `65535` |
| `int32` | Whole JSON numbers that fit in a signed 32-bit integer | `2147483647` |
| `uint32` | Whole JSON numbers that fit in an unsigned 32-bit integer | `4294967295` |

## "Enum" schemas

You can use `enum` in a schema to say that something has to be a string in a
given list. For example,

```json
{ "enum": ["FOO", "BAR", "BAZ" ]}
```

Accepts only `"FOO"`, `"BAR"`, and `"BAZ"`. Nothing else is accepted.

You can only do enums of strings; you can't have an enum of numbers in JTD.

## "Elements" schemas

To describe an array, use `elements`. The value of `elements` is another JTD
schema. For example,

```json
{ "elements": { "type": "string" }}
```

Accepts arrays where every element is a string. So `["foo", "bar"]` and `[]` are
OK, but `"foo"` and `[1, 2, 3]` are not.

## "Properties" schemas

To describe a JSON object where each key has a separate type of value, use a
"properties" schema. For example,

```json
{
    "properties": {
        "name": { "type": "string" },
        "isAdmin": { "type": "boolean" }
    }
}
```

Accepts objects that have a `name` property (which must be a string) and a
`isAdmin` property (which must be a boolean). If the object has any *extra*
properties, then it's invalid. So this is OK:

```json
{ "name": "Abraham Lincoln", "isAdmin": true }
```

But neither of these are:

```json
{ "name": "Abraham Lincoln", "isAdmin": "yes" }
```

```json
{ "name": "Abraham Lincoln", "isAdmin": true, "extra": "stuff" }
```

### Optional properties

If it's OK for a property to be missing, then you can use `optionalProperties`:

```json
{
    "properties": {
        "name": { "type": "string" },
        "isAdmin": { "type": "boolean" }
    },
    "optionalProperties": {
        "middleName": { "type": "string" }
    }
}
```

If there's a `middleName` property on the object, it has to be a string. But if
there isn't one, that's OK. So these are valid:

```json
{ "name": "Abraham Lincoln", "isAdmin": true }
```

```json
{ "name": "William Sherman", "isAdmin": false, "middleName": "Tecumseh" }
```

But this is not:

```json
{ "name": "John Doe", "isAdmin": false, "middleName": null }
```

### Extra properties

By default, `properties` / `optionalProperties` does not permit for "extra"
properties, i.e. properties not mentioned explicitly in the schema. If you're OK
with extra properties, you can use `"additionalProperties": true`. For example:

```json
{
    "properties": {
        "name": { "type": "string" },
        "isAdmin": { "type": "boolean" }
    },
    "additionalProperties": true
}
```

Would accept:

```json
{ "name": "Abraham Lincoln", "isAdmin": true, "extra": "stuff" }
```

## "Values" schemas

To describe a JSON object that's like a "dictionary", where you don't know the
keys but you do know what type the values should have, use a "values" schema.
The value of the `values` keyword is another JTD schema. For example,

```json
{ "values": { "type": "boolean" }}
```

Accepts objects where all the values are booleans. So it would accept `{}` or
`{"a": true, "b": false}`, but not `{"a": 1}`.

## "Discriminator" schemas

To describe a JSON object that works like a [tagged
union](https://en.wikipedia.org/wiki/Tagged_union) (aka: "discriminated union",
"sum type"), use a "discriminator" schema.

A "discriminator" schema has two keywords: `discriminator` tells you what
property is the "tag" property, and `mapping` tells you what schema to use,
based on the value of the "tag" property.

For example, let's say you have messages that look like this:

```json
{ "eventType": "USER_CREATED", "id": "users/123" }
{ "eventType": "USER_CREATED", "id": "users/456" }

{ "eventType": "USER_PAYMENT_PLAN_CHANGED", "id": "users/789", "plan": "PAID" }
{ "eventType": "USER_PAYMENT_PLAN_CHANGED", "id": "users/123", "plan": "FREE" }

{ "eventType": "USER_DELETED", "id": "users/456", "softDelete": false }
```

Basically, there are three kinds of messages: `USER_CREATED` messages look like
this:

```json
{
    "properties": {
        "id": { "type": "string" }
    }
}
```

`USER_PAYMENT_PLAN_CHANGED` messages look like this:

```json
{
    "properties": {
        "id": { "type": "string" },
        "plan": { "enum": ["FREE", "PAID"]}
    }
}
```

And `USER_DELETED` messages look like this:

```json
{
    "properties": {
        "id": { "type": "string" },
        "softDelete": { "type": "boolean" }
    }
}
```

With a "discriminator" schema, you can tie all three of those schemas together,
and tell JTD that you decide which one is relevant based on the value of
`eventType`. So here's the schema for our messages:

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
                "plan": { "enum": ["FREE", "PAID"]}
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

That schema would accept all of the messages in our example above. If the input
doesn't have a `eventType` property, or if the `eventType` property isn't one of
the three values mentioned in the `mapping`,  then the input is rejected.

You can only use `properties` / `optionalProperties` / `additionalProperties` in
the schemas you put directly in `mapping`. You can't use any other kind of
schema, otherwise things would become ambiguous.

## "Ref" schemas

Sometimes, you want to re-use a sub-schema multiple times, or you want to give
some sub-schema a particular name. You can use a "ref" schema to do this.

This is easiest to explain with an example. This schema:

```json
{
    "definitions": {
        "coordinates": {
            "properties": {
                "lat": { "type": "float32" },
                "lng": { "type": "float32" }
            }
        }
    },
    "properties": {
        "userLoc": { "ref": "coordinates" },
        "serverLoc": { "ref": "coordinates" }
    }
}
```

Will accept things like:

```json
{ "userLoc": { "lat": 50, "lng": -90 }, "serverLoc": { "lat": -15, "lng": 50 }}
```

The `{"ref": "coordinates"}` basically gets "replaced" by the `coordinates`
schema in `definitions`.

Note that `definitions` can only appear at the root (top level) of a JTD schema.
It's illegal to have `definitions` anywhere else.

## The `nullable` keyword

You can put `nullable` on any schema (regardless of which "form" it takes), and
that will make `null` be an acceptable value for the schema.

For example,

```json
{ "type": "string" }
```

Will accept `"foo"` and reject `null`. But if you add `"nullable": true`,

```json
{ "type": "string", "nullable": true }
```

That schema will accept both `"foo"` and `null`.

Note: you can't put `nullable` on a schema in [a discriminator
`mapping`](#discriminator-schemas). If you want a discriminator to be nullable,
you have to put it at the same level as the `discriminator` and `mapping`
keywords.

## The `metadata` keyword

The `metadata` keyword is legal on any schema, and if it's present it has to be
a JSON object. There are no constraints on what you can put in `metadata` beyond
that, and `metadata` has no effect on validation.

Usually, `metadata` is for putting things like descriptions or hints for code
generators, or other things tools can use.

## That's it

That's all you really need to know about JTD to be productive. If you want to
get started using JTD, your next step would be to [find an
implementation](/docs/implementations) in your preferred programming language.
