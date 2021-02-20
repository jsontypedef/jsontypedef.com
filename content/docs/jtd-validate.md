---
title: Validating JSON data in shell scripts with jtd-validate
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

`jtd-validate` is a CLI tool that can validate JSON input against a JSON Typedef
schema. It lives on GitHub
[here](https://github.com/jsontypedef/json-typedef-validate).

This article will go over why `jtd-validate` may be useful to you, how to
install it, and then go through an example of using `jtd-validate` in a shell
script.

## Why validating JSON from the shell is useful

First, to clarify terminology: a
[shell](https://en.wikipedia.org/wiki/Unix_shell) is the command language you
write in when you're using a terminal. Popular shells include
[`bash`](<https://en.wikipedia.org/wiki/Bash_(Unix_shell)>) and
[`zsh`](https://en.wikipedia.org/wiki/Z_shell). Shells are programming languages
that specialized for running CLI tools and capturing and redirecting their
input/output.

`jtd-validate` makes it easy to validate JSON from a shell script. This is
useful in situations where you're usually forced to write a shell script anyway,
such as in many configuration files, such as a `Dockerfile` or `Makefile`, or in
the configuration for your testing or CI/CD infrastructure (e.g.
[Jenkins](https://www.jenkins.io/) or [GitHub
Actions](https://github.com/features/actions)).

If you want to validate JSON data from within a program written in a
"traditional" (non-Shell) programming language, using `jtd-validate` is not
recommended. Instead, [use an implementation for the language you're working
in](/docs/implementations).

## Installing jtd-validate

If you're on macOS, the easiest way to install `jtd-validate` is via Homebrew:

```bash
brew install jsontypedef/jsontypedef/jtd-validate
```

For all other platforms, you can install a prebuilt binary from [the latest
release of
`jtd-fuzz`](https://github.com/jsontypedef/json-typedef-fuzz/releases/latest).
Supported platforms are:

- Windows (x86_64-pc-windows-gnu.zip)
- macOS (x86_64-apple-darwin.zip)
- Linux (x86_64-unknown-linux-gnu.zip)

## Using jtd-validate

You can always run `jtd-validate --help` to get details, but at a high level here's
how you usually use `jtd-validate`:

1. First, you need a schema to validate against.

2. Then, you need data to validate. This can be a single JSON message, or it can
   be a sequence of JSON messages, such as a file or stream of data with one
   JSON message per line.

3. Then, you invoke `jtd-validate` on your schema and input.

For example, let's say you have this schema in `user.jtd.json`:

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

And you have this message in `input.json`:

```json
{ "username": "asdf", "bio": 5 }
```

Then you would run:

```bash
jtd-validate user.jtd.json input.json
```

Which would output:

```json
{ "instancePath": "/bio", "schemaPath": "/properties/bio/type" }
```

If we "fixed" `input.json` to be compliant with the schema, such as by changing
it to:

```json
{ "username": "asdf", "bio": "foobar" }
```

Then `jtd-validate` would not output anything, indicating the input is valid.

When `jtd-validate` detects validation errors in the input, it will exit with a
non-zero status code. This means you can use `jtd-validate` in a shell `if`
statement:

```bash
if jtd-validate -q <(echo "$schema") <(echo "$input"); then
  echo "your input is good"
else
  echo "your input is not good"
fi
```

Or as way to abort a script if the output is not what you expect:

```bash
# This technique only works if you `set -x` in your shell script. `set -x` makes
# it so that sh/bash/zsh will immediately exit your script if any command exits
# with non-zero status code.
set -x

# As an example, we'll just use `echo` as our "script" whose output we want to
# make sure is valid.
script_output=$(echo '{"username": "adsf", "bio": 3}')

# If "$script_output" isn't valid against the schema, jtd-validate will exit
# unsuccessfully, immediately halting this shell script.
echo "$script_output" | jtd-validate path/to/my/schema.jtd.json
```
