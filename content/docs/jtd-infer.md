---
title: Generating Schemas from Examples with jtd-infer
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

`jtd-infer` is a tool that can generate a JSON Typedef schema from example data.
It lives on GitHub [here](https://github.com/jsontypedef/json-typedef-infer).

This article will go over why `jtd-infer` may be useful to you, how to install
it, and then go through an example of using `jtd-infer` on a few real-world
datasets.

## Why inferring schemas is useful

Inferring a schema from example data is useful because it makes it easier to
onboard onto JSON Typedef. If you have an existing system that works with JSON,
you can pass some of these JSON inputs/outputs into `jtd-infer`, and get a
schema out. From there, you can start [validating data against that
schema](/docs/implementations) or [generate data structures](/docs/jtd-codegen).
That means you can start seeing the value of JSON Typedef in your existing
system in just a few minutes.

`jtd-infer` can also be useful if you prefer to do a "code-first" approach,
where you first write your JSON data, and once you have an example of the data
in hand you start to write a schema. Some people find this easier to think about
than diving straight into writing a JSON Typedef schema.

## Installing jtd-infer

If you're on macOS, the easiest way to install `jtd-infer` is via Homebrew:

```bash
brew install jsontypedef/jsontypedef/jtd-infer
```

For all other platforms, you can install a prebuilt binary from [the latest
release of
`jtd-infer`](https://github.com/jsontypedef/json-typedef-infer/releases/latest).
Supported platforms are:

- Windows (x86_64-pc-windows-gnu.zip)
- macOS (x86_64-apple-darwin.zip)
- Linux (x86_64-unknown-linux-gnu.zip)

Finally, you can also install `jtd-infer` from source. See [the `jtd-infer`
repo](https://github.com/jsontypedef/json-typedef-infer) for more information if
you go this route.

## Using jtd-infer

You can always run `jtd-infer --help` to get details, but at a high level here's
how you usually use `jtd-infer`:

1. First, you need example data to infer from. `jtd-infer` will work on any
   sequence of JSON messages, so you can use any JSON file that contains one or
   more JSON messages in sequence.

   If your JSON messages are in multiple files, then a useful trick to know is
   that `cat dir/*.json` will output every JSON file in `dir` concatenated
   together. That will produce a sequence of JSON messages, and so `jtd-infer`
   can work with that.

2. Then, run `jtd-infer` on that data.

3. If the output in (2) could be improved by using an
   ["enum"](/docs/jtd-in-5-minutes#enum-schemas), a
   ["values"](/docs/jtd-in-5-minutes#values-schemas), or a
   ["discriminator"](/docs/jtd-in-5-minutes#discriminator-schemas) schema, then
   give `jtd-infer` some additional hints using `--enum-hint`, `--values-hint`,
   or `--discriminator-hint`.

For example, let's start with a very small example. Let's say you have this in a
file called `in.json`:

```json
{ "name": "Abraham Lincoln", "isAdmin": true }
```

If you run `jtd-infer in.json`, you will get this output:

```json
{
  "properties": {
    "name": { "type": "string" },
    "isAdmin": { "type": "boolean" }
  }
}
```

If `in.json` had some properties that aren't always present, it will guess that
the property is optional. So if `in.json` instead contained:

```json
{ "name": "Abraham Lincoln", "isAdmin": true }
{ "name": "William Sherman", "isAdmin": false, "middleName": "Tecumseh" }
```

Then `jtd-infer in.json` will output (note: the result here is formatted for
clarity):

```json
{
  "properties": {
    "isAdmin": {
      "type": "boolean"
    },
    "name": {
      "type": "string"
    }
  },
  "optionalProperties": {
    "middleName": {
      "type": "string"
    }
  }
}
```

## Changing the default number type

By default, `jtd-infer` will guess the narrowest, most specific number type for
your data. For example, if you show `jtd-infer` numbers like `1`, `2`, and `28`,
then it will guess you're working with unsigned, 8-bit numbers:

```bash
echo "[1, 2, 28]" | jtd-infer
```

```json
{ "elements": { "type": "uint8" } }
```

This may be undesirable behavior for you. There are two ways you can address
this:

1. Make your example data more representative of the range of numerical values
   you support. If you support negative or fractional numbers as input, try to
   make sure those appear in your examples. If there's a maximum or minimum
   value input numbers can take on, try to include those too.

2. Tell `jtd-infer` to guess a particular number type by default using
   `--default-number-type`.

All `--default-number-type` does is tell `jtd-infer` what number type to guess
when it sees a number. If your suggested default number type doesn't fit with
the data, `jtd-infer` will fall back to guessing a number type on its own.

For instance, here's how `--default-number-type` affects the previous example:

```bash
echo "[1, 2, 28]" | jtd-infer --default-number-type=int32
```

```json
{ "elements": { "type": "int32" } }
```

If you're using `jtd-infer` to retroactively schema-ify the inputs to a
JavaScript-based application, it could make sense to tell `jtd-infer` to assume
everything is a `float64`, because that's the only numerical type JavaScript
supports. You would do that by passing `--default-number-type=float64`.

## Giving jtd-infer hints

By default, `jtd-infer` will never output
["enum"](/docs/jtd-in-5-minutes#enum-schemas),
["values"](/docs/jtd-in-5-minutes#values-schemas), or
["discriminator"](/docs/jtd-in-5-minutes#discriminator-schemas) schemas. This is
done on purpose, to make `jtd-infer`'s behavior as predictable as possible;
rather than trying to guess if something is an enum versus just some generic
string, `jtd-infer` assumes everything is a string unless you tell it it's an
enum.

To get `jtd-infer` to output enum, values, or discriminator schemas, you can use
`--enum-hint`, `--values-hint`, or `--discriminator-hint`. These next sections
will show you how to do that with some examples.

### Using enum hints

Let's use a real-world dataset. The Nobel Prize organization maintains an API of
every Nobel prize. You can access that data by running:

```bash
curl http://api.nobelprize.org/v1/prize.json
```

You can run `jtd-infer` on this data like so:

```bash
curl http://api.nobelprize.org/v1/prize.json | jtd-infer
```

Which outputs this schema:

```json
{
  "properties": {
    "prizes": {
      "elements": {
        "properties": {
          "year": {
            "type": "string"
          },
          "category": {
            "type": "string"
          }
        },
        "optionalProperties": {
          "laureates": {
            "elements": {
              "properties": {
                "motivation": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "firstname": {
                  "type": "string"
                },
                "share": {
                  "type": "string"
                }
              },
              "optionalProperties": {
                "surname": {
                  "type": "string"
                }
              }
            }
          },
          "overallMotivation": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

What's of interest to us is the `category` property in that schema. As you may
already know, there are six categories of Nobel Prize; as a result, the
`category` property only ever takes on one of six values. This is a perfect
use-case for an enum. We can tell `jtd-infer` that the `category` property is an
enum, and it'll do the rest for us:

```bash
curl http://api.nobelprize.org/v1/prize.json | jtd-infer --enum-hint=/prizes/-/category
```

The value we pass to `--enum-hint` is a path inside the example data. The "-" in
the path is a wildcard; it means "any property of the object or array". When we
run that command, we get this result:

```json
{
  "properties": {
    "prizes": {
      "elements": {
        "properties": {
          "year": {
            "type": "string"
          },
          "category": {
            "enum": [
              "chemistry",
              "economics",
              "peace",
              "physics",
              "medicine",
              "literature"
            ]
          }
        },
        "optionalProperties": {
          "overallMotivation": {
            "type": "string"
          },
          "laureates": {
            "elements": {
              "properties": {
                "firstname": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "motivation": {
                  "type": "string"
                },
                "share": {
                  "type": "string"
                }
              },
              "optionalProperties": {
                "surname": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Now `category` is an `enum` schema, and we can see all six Nobel Prize
categories in the schema.

### Using values hints

Like with the "enum" example above, let's use a real-world dataset as an
example. The British government maintains an API of every bank holiday in the
UK. You can access it by running:

```bash
curl https://www.gov.uk/bank-holidays.json
```

You can run `jtd-infer` on this data like so:

```bash
curl https://www.gov.uk/bank-holidays.json | jtd-infer
```

Which outputs this schema:

```json
{
  "properties": {
    "scotland": {
      "properties": {
        "events": {
          "elements": {
            "properties": {
              "bunting": {
                "type": "boolean"
              },
              "notes": {
                "type": "string"
              },
              "date": {
                "type": "string"
              },
              "title": {
                "type": "string"
              }
            }
          }
        },
        "division": {
          "type": "string"
        }
      }
    },
    "england-and-wales": {
      "properties": {
        "events": {
          "elements": {
            "properties": {
              "date": {
                "type": "string"
              },
              "bunting": {
                "type": "boolean"
              },
              "title": {
                "type": "string"
              },
              "notes": {
                "type": "string"
              }
            }
          }
        },
        "division": {
          "type": "string"
        }
      }
    },
    "northern-ireland": {
      "properties": {
        "division": {
          "type": "string"
        },
        "events": {
          "elements": {
            "properties": {
              "notes": {
                "type": "string"
              },
              "date": {
                "type": "string"
              },
              "title": {
                "type": "string"
              },
              "bunting": {
                "type": "boolean"
              }
            }
          }
        }
      }
    }
  }
}
```

This output is _correct_, but it is also a bit verbose. The top-level keys in
the object are `scotland`, `england-and-wales`, and `northern-ireland`, and
their values all have the exact same schema. It could make more sense to say
that this data is really a map/dictionary from divisions of the UK to details
about that division, not a "struct".

To do that, we can tell `jtd-infer` that it should use a "values" schema at the
top level. Here's how you can do that:

```bash
curl https://www.gov.uk/bank-holidays.json | jtd-infer --values-hint=
```

We give `--values-hint` an empty string as a value. That's sort of a special
case value; it tells `jtd-infer` that we're talking about the _root_ of the
data, not any property within the data. When we run that command, we get this
result:

```json
{
  "values": {
    "properties": {
      "events": {
        "elements": {
          "properties": {
            "date": {
              "type": "string"
            },
            "bunting": {
              "type": "boolean"
            },
            "notes": {
              "type": "string"
            },
            "title": {
              "type": "string"
            }
          }
        }
      },
      "division": {
        "type": "string"
      }
    }
  }
}
```

Which is a bit clearer, and makes it obvious that the top-level properties all
have the same sort of data for their value.

### Using discriminator hints

Discriminated unions are very common in "event log" JSON payloads, such as in an
activity feed or an [event
sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) architecture.
Real-world examples include [GitHub's Events
API](https://docs.github.com/en/developers/webhooks-and-events/github-event-types)
and [AWS's EventBridge
API](https://docs.aws.amazon.com/eventbridge/latest/userguide/event-types.html).
However, most of these real-world examples are a bit too complex to serve as
good examples here. So in this section, we'll use a made-up but realistic
example to illustrate how to use `--discriminator-hint`.

Let's say you have an activity event log in your product, and every activity
event is a JSON message. Examples of this message include:

```json
{ "eventType": "USER_CREATED", "id": "users/123" }
{ "eventType": "USER_CREATED", "id": "users/456" }

{ "eventType": "USER_PAYMENT_PLAN_CHANGED", "id": "users/789", "plan": "PAID" }
{ "eventType": "USER_PAYMENT_PLAN_CHANGED", "id": "users/123", "plan": "FREE" }

{ "eventType": "USER_DELETED", "id": "users/456", "softDelete": false }
```

If you put those messages in a file called `in.json` and then ran `jtd-infer in.json`, you'd get this output:

```json
{
  "properties": {
    "id": {
      "type": "string"
    },
    "eventType": {
      "type": "string"
    }
  },
  "optionalProperties": {
    "plan": {
      "type": "string"
    },
    "softDelete": {
      "type": "boolean"
    }
  }
}
```

This is a decent first guess, but what we'd prefer is for `jtd-infer` to give us
a "discriminator" schema keyed off of `eventType`. That way, we can have a
schema that will let us be confident that for `USER_PAYMENT_PLAN_CHANGED`
events, `plan` will always be present.

To achieve this, we can give `jtd-infer` a hint: that the `eventType` property
is a discriminator property. So when we run:

```bash
jtd-infer in.json --discriminator-hint=/eventType
```

We get this output:

```json
{
  "discriminator": "eventType",
  "mapping": {
    "USER_CREATED": {
      "properties": {
        "id": {
          "type": "string"
        }
      }
    },
    "USER_DELETED": {
      "properties": {
        "id": {
          "type": "string"
        },
        "softDelete": {
          "type": "boolean"
        }
      }
    },
    "USER_PAYMENT_PLAN_CHANGED": {
      "properties": {
        "plan": {
          "type": "string"
        },
        "id": {
          "type": "string"
        }
      }
    }
  }
}
```

Which is much more precise, and reveals more clearly what is really going on
with these messages.

### Providing multiple hints

Although the previous examples all used the hint arguments separately, you can
also use them together, or give any hint multiple times. For example, this
example data:

```json
{ "id": "123", "kind": "LEGACY", "status": "OK", "tags": {"foo": "bar" }}
{ "id": "456", "kind": "LEGACY", "status": "ERROR", "tags": {"baz": "quux" }}
{ "id": "789", "kind": "MODERN", "status": "OK", "tags": {"asdf": "hjkl" }}
```

Would, by default, lead `jtd-infer` to infer this schema:

```json
{
  "properties": {
    "tags": {
      "optionalProperties": {
        "foo": {
          "type": "string"
        },
        "asdf": {
          "type": "string"
        },
        "baz": {
          "type": "string"
        }
      }
    },
    "kind": {
      "type": "string"
    },
    "status": {
      "type": "string"
    },
    "id": {
      "type": "string"
    }
  }
}
```

But if you wanted both `kind` and `status` to be treated as an enum, and `tags`
to be treated as a map/dictionary, you could invoke `jtd-infer` as:

```bash
jtd-infer --enum-hint=/kind --enum-hint=/status --values-hint=/tags
```

And you'll get this output instead:

```json
{
  "properties": {
    "id": {
      "type": "string"
    },
    "tags": {
      "values": {
        "type": "string"
      }
    },
    "kind": {
      "enum": ["LEGACY", "MODERN"]
    },
    "status": {
      "enum": ["ERROR", "OK"]
    }
  }
}
```
