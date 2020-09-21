---
title: "Validating JSON in Ruby with JSON Typedef"
sidebar_label: "Validation"
---

JSON Typedef is a schema language for JSON: it lets you describe the shape of
your JSON data in a portable way, and from that you can validate data and
generate datatypes from your schemas.

This article will explain how you can validate JSON using JSON Typedef in Ruby.

If you're unfamiliar with the syntax of JSON Typedef schemas, you may want to
first read ["Learn JSON Typedef"](getting-started/learn-json-typedef.md). That
said, JSON Typedef is pretty straightfoward, and you can probably guess what
most schemas in this article do without consulting that article.

## Step 1: Install the `jtd` package

The recommended Python implementation of JSON Typedef is [the `jtd`
gem][jtd-gh]. In a new directory, run:

```bash
gem install jtd
```

Or, if you're using `bundle`:

```bash
bundle add jtd
```

Right away, we can test out `jtd`, by starting up `irb`:

```text
irb(main):001:0> require 'jtd'
=> true
irb(main):002:0> schema = JTD::Schema.from_hash({ 'type' => 'string' })
irb(main):003:0> JTD::validate(schema, 'hello, world!')
=> []
```

The `JTD::validate` function returns an array of validation errors. But if you
validate `"hello, world!"` against the JSON Typedef schema `{ "type":
"string"}`, there are no validation errors -- the data is ok! So `JTD::validate`
returns an empty array.

Let's try out some invalid data:

```text
irb(main):004:0> JTD::validate(schema, 42)
=> [#<&#8203;struct JTD::ValidationError instance_path=[], schema_path=["type"]\>]
```

This time, `JTD::validate` gave us back an array with one element inside of it.
Every element of the array `JTD::validate` will always have two properties:

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

Already, it should be pretty clear that `JTD::validate` is the main function
you'll want to use from the `jtd` package. Now, let's explore a way you can
integrate `jtd` into your application.

For the rest of this article, we're going to assume you're writing some sort of
HTTP server. We'll use [Sinatra](https://github.com/sinatra/sinatra), but
nothing about `jtd` is limited to Sinatra or HTTP in particular. You can use
`jtd` anywhere you can use JSON.

To make things simple, here's a minimal HTTP server with Sinatra:

```ruby
# app.rb
require 'sinatra'

# Sort of a silly example, but the core of what's going on here is probably
# similar to apps you've written before: you accept some JSON over HTTP, and
# then do some processing of certain properties of that input.
post '/' do
  person = JSON.parse(request.body.read)

  sum = person['favoriteNumbers'].sum
  return "#{person['name']}'s favorite numbers add up to #{sum}"
end
```

Run this with `ruby app.rb` (or `bundle exec app.rb`, after having done `bundle
add sinatra`), and then you can test it right away:

```bash
curl localhost:4567 -d '{ "name": "John Doe", "favoriteNumbers": [1, 3.14, 42] }'
```

```text
John Doe's favorite numbers add up to 46.14
```

But what if someone inputs a string instead of a number? Let's change `3.14` to
`"3.14"`:

```bash
curl localhost:4567 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }'
```

The application crashes! In the logs, we see:

```text
TypeError: String can't be coerced into Integer
	app.rb:9:in `+'
	app.rb:9:in `sum'
	app.rb:9:in `block in <&#8203;main>'
    ...
```

Fixing this with `jtd` is as simple as calling `JTD::validate` before you
attempt to do any processing of the data. Here's how you can do that:

```ruby
require 'sinatra'
require 'jtd' # new: we require jtd

# New: we define the schema of the data we want to accept.
schema = JTD::Schema.from_hash({
  'properties' => {
    'name' => { 'type' => 'string' },
    'favoriteNumbers' => {
      'elements' => { 'type' => 'float64' }
    }
  }
})

post '/' do
  person = JSON.parse(request.body.read)

  # New: we call JTD::validate with our schema (defined above), and make sure
  # the input is valid.
  validation_errors = JTD::validate(schema, person)
  unless validation_errors.empty?
    # If there are any errors, we refuse to process the message.
    halt 400, "Validation errors"
  end

  sum = person['favoriteNumbers'].sum
  return "#{person['name']}'s favorite numbers add up to #{sum}"
end
```

Now if we try the same `3.14` changed to `"3.14"`, we get a validation error
instead of a nonsensical response:

```bash
curl localhost:4567 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }'
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

```ruby
# If there are any errors, we refuse to process the message.
halt 400, "Validation errors"
```

Into:

```ruby
# If there are any errors, we refuse to process the message.
#
# We'll send back each validation error we got back from JSON Typedef
# validation.
errors = {
  'validationErrors' => validation_errors.map do |e|
    { 'instancePath' => e.instance_path, 'schemaPath' => e.schema_path }
  end
}

halt 400, errors.to_json
```

So now, we get a specific, detailed error message telling us where the error was
in our request, and what part of the schema rejected the input:

```bash
# Note: we here pipe `curl` into `jq`, a tool which will pretty-print JSON.
curl localhost:4567 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' | jq
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

```ruby
def to_json_pointer(arr)
  return '' if arr.empty?

  # This ~0 and ~1 stuff is related to how JSON Pointer escapes "/" and "~".
  '/' + arr.map { |s| s.gsub('~', '~0').gsub('/', '~1') }.join('/')
end
```

And then, instead of returning:

```ruby
errors = {
  'validationErrors' => validation_errors.map do |e|
    { 'instancePath' => e.instance_path, 'schemaPath' => e.schema_path }
  end
}
```

Return instead:

```ruby
errors = {
  'validationErrors' => validation_errors.map do |e|
    {
      'instancePath' => to_json_pointer(e.instance_path),
      'schemaPath' => to_json_pointer(e.schema_path)
    }
  end
}
```

And now you'll get some terser error messages, which might be easier to
understand:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' | jq
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

By default, `JTD::validate` returns every error it finds. If you just care about
whether there are any errors at all, or if you can't show more than some number
of errors, then you can get better performance out of `JTD::validate` using the
`max_errors` option.

For example, we can take the previous example, but only every return at most one
error, by changing:

```ruby
validation_errors = JTD::validate(schema, person)
```

Into:

```ruby
options = jtd::ValidationOptions(max_errors: 1)
validation_errors = JTD::validate(schema, person, options)
```

### Handling untrusted schemas

If you're interested in using `jtd` to handle untrusted schemas -- for example,
if you're trying to validate data against a schema that you didn't write, then
you should take extra precautions to avoid Denial-of-Service attacks.

See ["Advanced Usage: Handling Untrusted Schemas"][jtd-gh-untrusted-schemas] in
the `jtd` README on GitHub for how you can safely handle untrusted schemas.

[jtd-gh]: https://github.com/jsontypedef/json-typedef-ruby
[jtd-gh-untrusted-schemas]:
https://github.com/jsontypedef/json-typedef-ruby#advanced-usage-handling-untrusted-schemas
