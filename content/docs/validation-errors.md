---
title: Portable Validation Errors with JSON Typedef
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about the validation errors you get out of JSON Typedef. One
aspect of validation that is often overlooked is the exact shape and contents of
validation messages themselves. In JSON Typedef, validation errors are:

1. Plain old JSON messages, that are both human-readable and machine-readable.

   Validation errors are simply JSON objects, with two properties: a path to the
   part of the input that is invalid (the `instancePath`), and a path to the
   part of the schema that rejected the input (the `schemaPath`). For example:

   ```json
   { "instancePath": "/age", "schemaPath": "/properties/age/type" }
   ```

   This makes validation errors easy to manipulate as ordinary data, such as if
   you want to aggregate validation errors or return them to the user in a JSON
   API. The paths themselves are [JSON Pointers (RFC 6901)](https://tools.ietf.org/html/rfc6901), a simple, easy-to-parse format
   with existing implementations in most programming languages.

2. Scalable to very large inputs and very complex schemas.

   The simple `instancePath` + `schemaPath` design scales well, even if your
   schemas start to become very complex. As an example of a design that doesn't
   scale well, many validation libraries give you errors like:

   ```text
   ValidationError: "age" must be a number, got: string
   ```

   This scales poorly with complex schemas. What if there are dozens of
   properties called `age` in your schema? Which part of the schema raised this
   error? What part of the input was it looking at? Maybe you can figure this
   out as a human, but for machines to detect these problems (for instance, if
   you want to automatically highlight the part of the JSON input that's
   problematic) is much more challenging.

3. Portable and consistent across every JSON Typedef implementation.

   Most JSON validation solutions are language-specific. This is fine at first,
   but becomes a problem if you want to swap out validation solutions, such as
   if you're porting your system to a new programming language. Because of
   [Hyrum's Law](https://www.hyrumslaw.com/), every aspect of your validation
   will eventually become something someone depends on, meaning that swapping
   out validation solutions will often be a breaking change for some users.

   Because every compliant JSON Typedef implementation returns the same
   validation errors, JSON Typedef can help you deal with Hyrum's Law. You can
   swap out any JSON Typedef implementation for any other, without any
   observable difference from the outside.

The rest of this article is a brief summary of all the possible error conditions
in JSON Typedef, and what the `instancePath` and `schemaPath` will be.

## Error Conditions in JSON Typedef

This section is a summary of the possible validation error conditions that can
arise from validating an input against an instance. Most JSON Typedef users
don't need to know all of these conditions.

### Errors from "Empty" Schemas

["Empty" schemas](/docs/jtd-in-5-minutes#empty-schemas) will never result in
validation errors.

### Errors from "Type" Schemas

["Type" schemas](/docs/jtd-in-5-minutes#type-schemas) will only ever produce
errors whose `schemaPath` points to the schema's `type` property, and an
`instancePath` pointing to the input.

### Errors from "Enum" Schemas

["Enum" schemas](/docs/jtd-in-5-minutes#enum-schemas) will only ever produce
errors whose `schemaPath` points to the schema's `enum` property, and an
`instancePath` pointing to the input.

### Errors from "Elements" Schemas

["Elements" schemas](/docs/jtd-in-5-minutes#elements-schemas) will only ever
produce errors whose `schemaPath` points to the schema's `elements` property,
and an `instancePath` pointing to the input.

Keep in mind that "elements" schemas also evaluate a sub-schema on each element
of the input array. That sub-schema may produce its own errors.

### Errors from "Properties" Schemas

["Properties" schemas](/docs/jtd-in-5-minutes#properties-schemas) may produce a
few different validation errors:

1. If the input isn't an object, then the validation error's `instancePath` will
   point to the input. The `schemaPath` will point to the schema's `properties`
   property if it exists. If the schema doesn't have `properties` (only
   `optionalProperties`), then the `schemaPath` will point to the
   `optionalProperties` property instead.

2. If the input is missing a non-optional property, then the validation error's
   `instancePath` will point to the input and the `schemaPath` will point to the
   schema for the missing property.

3. If the input has unpermitted "extra" properties, then the validation error's
   `instancePath` will point to the the "extra" property, and the `schemaPath`
   will point to the schema itself (not the `properties` or `optionalProperties`
   property).

Keep in mind that "properties" schemas also evaluate sub-schemas on properties
of the input. Those sub-schemas may produce their own errors.

### Errors from "Values" Schemas

["Values" schemas](/docs/jtd-in-5-minutes#values-schemas) will only ever produce
errors whose `schemaPath` points to the schema's `values` property, and an
`instancePath` pointing to the input.

Keep in mind that "values" schemas also evaluate a sub-schema on each value of
the input object. That sub-schema may produce its own errors.

### Errors from "Discriminator" Schemas

["Discriminator" schemas](/docs/jtd-in-5-minutes#discriminator-schemas) may
produce a few different validation errors:

1. If the input isn't an object, or doesn't have the "tag" property, then the
   validation error's `instancePath` will point to the input. The `schemaPath`
   will point to the schema's `discriminator` property.

2. If the input's "tag" property value isn't a string, then the validation
   error's `instancePath` will point to the input's "tag" property. The
   `schemaPath` will point to the schema's `discriminator` property.

3. If the input's "tag" property is a string, but it's not one of the keys in
   the schema's `mapping`, then the validation error's `instancePath` will point
   to the input's "tag" property, and the `schemaPath` will point to the
   schema's `mapping` property.

Keep in mind that "discriminator" schemas also evaluate a sub-schema on the
input object. That sub-schema may produce its own errors.
