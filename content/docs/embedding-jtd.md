---
title: Embedding JSON Typedef in other tools
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

JSON Typedef is explicitly designed to be easy to use as a "sub-routine" inside
other data formats or other tooling. This article goes over some techniques you
can use to "embed" JSON Typedef schemas inside your own tooling.

## What does it mean to "embed" JSON Typedef?

"Embedding" JSON Typedef refers to the practice of defining your own file or
message format, and some part of that format is a JSON Typedef schema. For
example, one of the most common ways JSON Typedef gets embedded in other systems
when you want to make a custom [Interface Description
Language](https://en.wikipedia.org/wiki/Interface_description_language) for your
organization.

## Embedding jtd-codegen

The [`jtd-codegen` tool](/docs/code-generation) generates code in many
programming languages from a JSON Typedef schema. If you're embedding JSON
Typedef in a custom file format, it's often useful to be able to use
`jtd-codegen`'s generated types as part of your own code generation tooling.

For example, if you're embedding JSON Typedef in a custom Interface Description
Language, maybe you want to handle generating code that deals with the specifics
of your interface, such as generating the basic structure of an HTTP handler or
[Kafka](https://en.wikipedia.org/wiki/Apache_Kafka) consumer. But in order to
generate that code, you need to have types for the inputs (HTTP requests, Kafka
messages consumed) and outputs (HTTP responses, Kafka messages produced) of your
interface.

If you're using JSON Typedef in your custom file format to describe those inputs
and outputs, you can use `jtd-codegen` to generate types for those
inputs/outputs, and `jtd-codegen` can tell you what names it generated for each
of those inputs/outputs.

Whenever you invoke `jtd-codegen`, in the output you'll get the names of
generated types in human-friendly format. For example, if you generate code from
this schema:

```json
{
  "definitions": {
    "location": {
      "properties": {
        "lat": { "type": "float32" },
        "lng": { "type": "float32" }
      }
    }
  },
  "properties": {
    "user_location": { "ref": "location" },
    "server_location": { "ref": "location" }
  }
}
```

Then you'll get output that looks like this from `jtd-codegen`:

```bash
jtd-codegen location_pair.jtd.json --typescript-out=src/user
```

```text
📝 Writing TypeScript code to: src/user
📦 Generated TypeScript code.
📦     Root schema converted into type: LocationPair
📦     Definition "location" converted into type: Location
```

This is exactly the sort of information we need if we want to re-use the
`jtd-codegen`-generated types (in this case, `LocationPair` and `Location`) in
our own code. To make this information easier to parse, `jtd-codegen` can output
instead in JSON. For example:

```bash
jtd-codegen --log-format=json location_pair.jtd.json --typescript-out=src/user | jq
```

```json
{
  "TypeScript": {
    "out_dir": "src/user",
    "root_name": "LocationPair",
    "definition_names": {
      "location": "Location"
    }
  }
}
```

So what you can do is call `jtd-codegen` with `--log-format=json` from your own
code generation program, parse the JSON output, and then use the generated names
in your generated code.

Keep in mind you don't have to create a JSON Typedef schema file in order to use
`jtd-codegen`. As mentioned in ["Integrating
jtd-codegen"](/docs/jtd-codegen/#integrating-jtd-codegen), you can pass
`jtd-codegen` a schema through stdin, and you can use `--root-name` to give
`jtd-codegen` a hint of what name you'd like to give the generated root
datatype.
