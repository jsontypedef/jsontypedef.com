---
title: Making your own implementation of JSON Typedef
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

This article is about how you can make your own implementation of the JSON Type
Definition specification. This is a relatively advanced topic, and is not
something most people need to do. If you're just looking to _use_ JSON Typedef,
then check out [this list of existing implementations](/docs/implementations)
that you can use off-the-shelf.

JSON Typedef is a specification that's designed to be easy to implement. This
article exists to give guidance on how you should consider going about making
your implementation, to make the process even easier.

## Recommended process for implementing JSON Typedef

Here are a few high-level steps you should follow before writing any code:

1. [Learn JSON Typedef](/docs/jtd-in-5-minutes) if you haven't already.
2. Look through [the existing implementations](/docs/implementations) to see if
   there's already one written in a language or style that is similar to what
   you'd like to create. You can use this for inspiration or reference as you're
   working.
3. Pull up [RFC 8927](https://tools.ietf.org/html/rfc8927). You don't have to
   read the spec to implement it. But if you run into confusion over what JSON
   Typedef prescribes, these sections of the RFC will have unambiguous, formal
   language explaining what you should do:

   - [Section 2](https://tools.ietf.org/html/rfc8927#section-2) goes over what
     is and isn't a valid JSON Typedef schema.
   - [Section 3](https://tools.ietf.org/html/rfc8927#section-3) goes over how
     validation works.

As you begin coding, it is strongly recommended that you use [the standard test
suite](https://github.com/jsontypedef/json-typedef-spec) in your work. In
particular, the standard test suite has two files that will be of use to you:

- [`tests/invalid_schemas.json`](https://github.com/jsontypedef/json-typedef-spec/blob/master/tests/invalid_schemas.json)
  gives a bunch of examples of data that are not valid JSON Typedef schemas. You
  should consider adding tests that make sure none of these schemas are
  considered "valid" schemas in your implementation.

- [`tests/validation.json`](https://github.com/jsontypedef/json-typedef-spec/blob/master/tests/validation.json)
  gives a bunch of examples of schemas, inputs, and the validation errors that
  should pop out. You should consider adding tests that make sure your
  implementation returns the same set of errors (order doesn't matter). You
  should also consider adding tests that make sure your implementation thinks
  all of the schemas in this file are valid.

Finally, for security reasons, you should strongly consider adding a "max depth"
mechanism to your validation routine. Otherwise, your implementation may become
the source of an [algorithmic complexity
attack](https://en.wikipedia.org/wiki/Algorithmic_complexity_attack). Think
about what happens if your implementation is asked to validate data against the
following, valid, JSON Typedef schema:

```json
{
  "definitions": {
    "loop": {
      "ref": "loop"
    }
  },
  "ref": "loop"
}
```

If your implementation goes into an infinite loop or goes into a stack overflow,
and there isn't any set of configuration your users can employ to prevent your
implementation from behaving that way, then attackers may figure out a way to
use your implementation as a way to take up 100% of an application's CPU or to
send it into a crash loop, potentially causing a denial of service attack.

If your implementation maintains a "depth counter", keeping track of many `ref`s
"deep" you are while validating, then you can write a "circuit breaker" that
detects if you ever get beyond a `ref` depth of _N_, and aborts validation in
that case. All of the implementations listed in [the
implementations](/docs/implementations) list have this mechanism in place, so
consider looking at their source code if things are unclear.
