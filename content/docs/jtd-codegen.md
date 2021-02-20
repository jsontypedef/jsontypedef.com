---
title: Generating Code from JSON Typedef Schemas with jtd-codegen
---

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

`jtd-codegen` is a tool that can generate types (clases, interfaces, structs,
etc.) in many programming languages from a JSON Typedef schema. It lives on
GitHub [here](https://github.com/jsontypedef/json-typedef-codegen).

This article will get you started on why `jtd-codegen` may be useful to you, how
to install it, and how you can use `jtd-codegen`-generated code in your
applications. Because every language has its own conventions and paradigms,
using the generated code will vary a bit from language to language. For specific
guidance for your preferred language, see:

* [TypeScript-specific documentation](/docs/typescript-codegen)
* [Go-specific documentation](/docs/Go-codegen)
* [Java-specific documentation](/docs/Java-codegen)
* [C#-specific documentation](/docs/csharp-codegen)
* [Python-specific documentation](/docs/python-codegen)
* [Rust-specific documentation](/docs/rust-codegen)

## Why generating code from schemas is useful

At a high level, generating code from schemas is useful because it fixes the
missing link between your program's type system and the JSON your program
reads/writes. The alternatives to generating code from schemas is:

1. Writing the JSON mapping layer yourself. This entails writing classes,
   structs, or whatever else is idiomatic to your language that know how to load
   themselves from JSON, and know how to write themselves out as JSON.

   Writing this sort of code is an error-prone and tedious process. If you have
   clients and servers written in different languages, you'll have to repeat
   this work for every language in use every time you change your schema.

2. Not writing a JSON mapping layer at all. This means that you pass around some
   generic JSON data blob throughout your code.

   When you do this, you lose the ability to lean on your compiler and IDE to
   tell you what properties do and don't exist in your JSON, and what type those
   properties have. Very often, you'll run into runtime errors due to missing
   properties, properties of the wrong type, etc. Plus, the result is usually
   less performant, because JSON blobs can't be optimized like native types can.

JSON Type Definition is oftentimes a better alternative. It can do [runtime
validation of JSON inputs](/docs/implementations) *and* give you compile-time
data structures for valid data (via `jtd-codegen`), all from a single source of
truth: your JSON Typedef schema. Your code will be reliable against bad inputs,
you'll save yourself the pain of writing mudane JSON mapping code, and you'll be
able to write type-safe code end-to-end.

## Installing jtd-codegen

If you're on macOS, the easiest way to install `jtd-codegen` is via Homebrew:

```bash
brew install jsontypedef/jsontypedef/jtd-codegen
```

For all other platforms, you can install a prebuilt binary from [the latest
release of
`jtd-codegen`](https://github.com/jsontypedef/json-typedef-codegen/releases/latest).
Supported platforms are:

* Windows (x86_64-pc-windows-gnu.zip)
* macOS (x86_64-apple-darwin.zip)
* Linux (x86_64-unknown-linux-gnu.zip)

Finally, you can also install `jtd-codegen` from source. See [the `jtd-codegen`
repo](https://github.com/jsontypedef/json-typedef-codegen) for more information
if you go this route.

## Using jtd-codegen

You can always run `jtd-codegen --help` to get details, but at a high level
here's how you usually use `jtd-codegen`:

1. First, you need a schema to generate code from. Let's pretend you have this
   in a file called `schemas/user.jtd.json`.

2. Then, you need to know what programming languages you want to generate code
   for, and where you want `jtd-codegen` to put the generated code. Let's
   pretend you're interested in TypeScript, and you want to put the code in a
   `src/user` directory.

3. Finally, you invoke `jtd-codegen` on your file, passing the CLI flags for the
   language(s) you're interested in. You tell `jtd-codegen` what language(s) to
   generate using the appropriate `--XXX-out` flag. For TypeScript, that's
   `--typescript-out`.

Putting it all together, you get this invocation for TypeScript:

```bash
jtd-codegen schemas/user.jtd.json --typescript-out src/user
```

When you run that, you'll get output like this:

```text
📝 Writing TypeScript code to: src/user
📦 Generated TypeScript code.
📦     Root schema converted into type: User
```

And, assuming your `user.jtd.json` looked something like this:

```json
{
  "properties": {
    "id": { "type": "string" },
    "createdAt": { "type": "timestamp" },
    "karma": { "type": "int32" },
    "isAdmin": { "type": "boolean" }
  }
}
```

Then the generated `src/user/index.ts` would contain:

```ts
export interface User {
    createdAt: string;
    id: string;
    isAdmin: boolean;
    karma: number;
}
```

Some languages require additional configuration, however. For example, if you
were to try to do the same thing, but with Go (i.e. replacing `--typescript-out`
with `--go-out`), you'll get this error:

```text
error: The following required arguments were not provided:
    --go-package <package>
```

As the error suggests, you can fix this issue by passing the Go-specific
required arguments. For instance, this invocation would work:

```bash
jtd-codegen schemas/user.jtd.json --go-out src/user --go-package user
```

And generates the following inside `src/user/user.go`:

```go
package user

import "time"

type User struct {
    CreatedAt time.Time `json:"createdAt"`
    ID        string    `json:"id"`
    IsAdmin   bool      `json:"isAdmin"`
    Karma     int32     `json:"karma"`
}
```

## Integrating jtd-codegen

Every programming language is different, and `jtd-codegen` strives to generate
code that is idiomatic to each language. For that reason, exactly how you
integrate generated code in your codebase will depend on the language. See the
language-specific documentation (links at [the top of this article](#top)) for
specifics.

Here are some general considerations on how you can integrate `jtd-codegen` into
your codebase's workflow.

* `jtd-codegen` is deterministic. If you give it the same schema, you'll get the
  same code generated each time. So if it makes your life easier, you can
  consider invoking `jtd-codegen` on every build. You can consider checking
  generated code into source control for the same reason.

* `jtd-codegen` is `make`-friendly. In particular, if you want to regenerate
  `src/user/index.ts` whenever `schemas/user/user.jtd.json` changes, the
  following `Makefile` recipe could do the trick:

  ```make
  src/user/index.ts: schemas/user/user.jtd.json
      jtd-codegen --typescript-out src/user schemas/user.jtd.json
  ```

* You can pass `jtd-codegen` a schema via standard in. This can be useful if
  you're writing your schemas as YAML, because that means you can do something
  like this:

  ```bash
  # yaml2json is a program that takes YAML and prints JSON to stdout
  yaml2json schemas/user.jtd.yml | jtd-codegen - --root-name user [...]
  ```

  Where `[...]` is whatever CLI flags you would normally pass to `jtd-codegen`.
  Note that the schema "file" is just `-`: that tells `jtd-codegen` to read the
  schema from stdin.

  Note also the `--root-name` argument, which tells `jtd-codegen` what the
  "top-level" name of the schema is. When you use a file as input to
  `jtd-codegen`, it can infer the value of `--root-name` from the name of the
  file. But stdin doesn't have a name, so you'll need to give `jtd-codegen` a
  hint if you want it to generate good type names.

Finally, if you're using `jtd-codegen` in your own tooling -- for instance, if
you're building some sort of custom interface description language (à la
OpenAPI) on top of JTD, see [the `jtd-codegen` guidance in "Embedding
JTD"](/docs/embedding-jtd#embedding-jtd-codegen) for how you can plug
`jtd-codegen`-generated code into your tooling.
