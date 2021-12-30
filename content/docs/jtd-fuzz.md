---
title: Generating Example Data from Schemas with jtd-fuzz
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

`jtd-fuzz` is a tool that can generate example data from a JSON Typedef schema.
This is also called "fuzzing". It lives on GitHub
[here](https://github.com/jsontypedef/json-typedef-infer).

This article will go over why `jtd-fuzz` may be useful to you, how to install
it, and then go through an example of using `jtd-fuzz` on a few schemas.

## Why fuzzing schemas is useful

Generating example data from schemas is useful because you can use it to do fuzz
testing, load testing, or to seed your system with interesting data.

- [Fuzz testing](https://en.wikipedia.org/wiki/Fuzzing) is when you run your
  system against randomized but valid data to try to find corner cases where
  your system crashes, hangs, or otherwise misbehaves. You can use `jtd-fuzz` to
  generate this randomized valid data.

- [Load testing](https://en.wikipedia.org/wiki/Load_testing) is when you send
  your system a lot of requests, and then see how it behaves when under stress.
  Oftentimes, load tests produce more interesting results when the requests are
  randomized, that way you exercize more branches in your code. `jtd-fuzz` can
  help generate these randomized requests.

- [Seeding](https://en.wikipedia.org/wiki/Database_seeding) is when you
  initialize a system, usually a database, with some example data. This is
  useful because it lets you see how your APIs or UIs look when they have data
  inside of them, rather than working from a blank slate. Oftentimes,
  development or staging environment databases are filled with seed data.
  `jtd-fuzz` can help you generate seed data.

## Installing jtd-fuzz

If you're on macOS, the easiest way to install `jtd-fuzz` is via Homebrew:

```bash
brew install jsontypedef/jsontypedef/jtd-fuzz
```

For all other platforms, you can install a prebuilt binary from [the latest
release of
`jtd-fuzz`](https://github.com/jsontypedef/json-typedef-fuzz/releases/latest).
Supported platforms are:

- Windows (x86_64-pc-windows-gnu.zip)
- macOS (x86_64-apple-darwin.zip)
- Linux (x86_64-unknown-linux-gnu.zip)

Finally, you can also install `jtd-fuzz` from source. See [the `jtd-fuzz`
repo](https://github.com/jsontypedef/json-typedef-fuzz) for more information if
you go this route.

## Using jtd-fuzz

You can always run `jtd-fuzz --help` to get details, but at a high level here's
how you usually use `jtd-fuzz`:

1. First, you need a schema to generate examples from.

2. Then, you need to decide how many examples you want to generate. By default,
   `jtd-fuzz` will generate an infinite stream of examples, but you can override
   this by passing `-n XXX` to `jtd-fuzz`, where `XXX` is the number of examples
   you want.

3. Then, you invoke `jtd-fuzz` on your schema.

4. Optionally, you can [use `fuzzHint` to generate specific sorts of fake
   data](#using-fuzzhint), if that makes sense for your use-case.

5. Optionally, if you want to be able generate this exact dataset again later,
   you can [use the `-s` flag to generate consistent
   results](#generating-consistent-results).

For example, if you want to generate five examples from this schema, which you
placed inside `user.jtd.json`:

```json
{
  "properties": {
    "username": {
      "type": "string"
    },
    "bio": {
      "type": "string"
    }
  }
}
```

Then you would run:

```bash
jtd-fuzz user.jtd.json -n 5
```

Which would output something like:

```json
{"bio":"c0FW!","username":"L{0'%"}
{"bio":"2bf*s|%","username":"R q"}
{"bio":"2i","username":"z;L"}
{"bio":"","username":""}
{"bio":"(","username":""}
```

## Using `fuzzHint`

In the example above, the `username` and `bio` properties were short, randomized
strings. That might not be the most useful behavior. Oftentimes, it's more
convenient if fuzzed data uses realistic emails, names, or [lorem
ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum) text.

`jtd-fuzz` can generate this sort of data using the `fuzzHint` [metadata
property](/docs/jtd-in-5-minutes#the-metadata-keyword). Here's an example of how
you can adapt the previous example to use `fuzzHint`:

```json
{
  "properties": {
    "username": {
      "metadata": {
        "fuzzHint": "en_us/internet/username"
      },
      "type": "string"
    },
    "bio": {
      "metadata": {
        "fuzzHint": "lorem/sentence"
      },
      "type": "string"
    }
  }
}
```

If you run `jtd-fuzz` on that schema, you'll get output like:

```json
{"bio":"Error ut voluptatem nihil sunt laboriosam ut.","username":"obechtelar"}
{"bio":"Perspiciatis nostrum quidem laudantium esse dignissimos possimus.","username":"wrunolfsdottir"}
{"bio":"Vitae error ratione optio et.","username":"tcarroll76"}
{"bio":"Assumenda quaerat et.","username":"ogleichner"}
{"bio":"Officia vel aspernatur.","username":"rbeier"}
```

`fuzzHint` will only work on schemas of `{"type": "string"}`. Here are some
commonly-used values for `fuzzHint`:

- `en_us/company/company_name` generates strings like `Hayes, Murray, and Kiehn`
- `en_us/internet/email` generates strings like `alainatorphy@johnson.com`
- `en_us/names/full_name` generates strings like `Alexa Wisozk`

A full list of possible values for `fuzzHint` is available
[here](https://docs.rs/jtd-fuzz/0.2.0/jtd_fuzz/fn.fuzz.html#using-fuzzhint).

Remember that [metadata properties don't affect
validation](/docs/jtd-in-5-minutes#the-metadata-keyword). What you put in
`fuzzHint` will have no effect on what validators will consider valid input or
not.

## Generating consistent results

By default, `jtd-fuzz` will generate different output on every invocation. If
you run `jtd-fuzz` on the same schema twice, you'll get back two different sets
of results:

```bash
echo '{}' | jtd-fuzz -n 1
echo '{}' | jtd-fuzz -n 1
```

```json
{"[jD|6W":null}
null
```

If you'd like to get consistent output from `jtd-fuzz`, or be able to reproduce
its output, you can use the `-s` option to provide a seed to its internal
pseudo-random number generator. For the same seed and schema, `jtd-fuzz` will
output the same data every time:

```bash
echo '{}' | jtd-fuzz -n 1 -s 123
echo '{}' | jtd-fuzz -n 1 -s 123
```

```json
48
48
```

The `-s` option takes an integer between 0 and 2^64 - 1.

Seeding `jtd-fuzz` can be useful if you're using `jtd-fuzz` to do automated
testing against a system. Your automated testing system can pass `jtd-fuzz` a
randomly-generated seed, and if the automated tester finds a seed that reveals a
bug, it can output the seed it used. That way, developers can re-use that seed,
and try to reproduce the issue locally.

Note that `jtd-fuzz` is only guaranteed to produce consistent output if you use
the same seed, schema, and version of `jtd-fuzz`. Different versions on
`jtd-fuzz` may output different results, even if you give them the same seed and
schema.
