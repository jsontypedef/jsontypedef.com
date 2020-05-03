---
title: "Validating JSON in Go with JSON Typedef"
sidebar_label: "Validation"
---

> This article is about JSON Typedef *validation* with Go. If instead you're
> interested in JSON Typedef *code generation* with Go, see the next article,
> ["Generating Go from JSON Typedef Schemas"](golang/code-generation.md).

JSON Typedef is a schema language for JSON: it lets you describe the shape of
your JSON data in a portable way, and from that you can validate data and
generate datatypes from your schemas.

This article will explain how you can validate JSON using JSON Typedef in Go.

If you're unfamiliar with the syntax of JSON Typedef schemas, you may want to
first read ["Learn JSON Typedef"](getting-started/learn-json-typedef.md). That
said, JSON Typedef is pretty straightfoward, and you can probably guess what
most schemas in this article do without consulting that article.

## Step 1: Install `github.com/jsontypedef/json-typedef-go`

The recommended Golang implementation of JSON Typedef is [the
`github.com/jsontypedef/json-typedef-go` module][jtd-go]. If you're using Go
modules in your project, you can do this by running:

```bash
go get github.com/jsontypedef/json-typedef-go
```

Although the package's name ends in `json-typedef-go`, it exposes a package
called `jtd`. In other words, this:

```go
import "github.com/jsontypedef/json-typedef-go"
```

Is the same thing as:

```go
import jtd "github.com/jsontypedef/json-typedef-go"
```

Right away, we can test out `jtd`. Create a `main.go` that looks like this:

```go
package main

import (
	"encoding/json"
	"fmt"

	"github.com/jsontypedef/json-typedef-go"
)

func main() {
	schemaJSON := `{ "type": "string" }`
	dataJSON := `42`

	var schema jtd.Schema
	if err := json.Unmarshal([]byte(schemaJSON), &schema); err != nil {
		panic(err)
	}

	var data interface{}
	if err := json.Unmarshal([]byte(dataJSON), &data); err != nil {
		panic(err)
	}

	validationErrors, err := jtd.Validate(schema, data)
	if err != nil {
		panic(err)
	}

	fmt.Printf("%#v\n", validationErrors)
}
```

All this code does is validate the JTD schema `{ "type": "string" }` against the
JSON data `42`, and print the result. If you run this, you'll get:

```bash
go run main.go
```

```text
[]jtd.ValidateError{jtd.ValidateError{InstancePath:[]string{}, SchemaPath:[]string{"type"}}}
```

This output is a bit noisy, but ultimately you can see that:

1. `jtd.Validate` gave us back an array with one element. That means there was
   one validation error with this input. By default, `jtd.Validate` will give us
   *every* validation error, but we'll see how to configure that [later in this
   article](#limiting-errors-returned).
2. The validation error we got back from `jtd.Validate` had two properties.
   `jtd.Validate` guarantees these properties will always be present:

   * `InstancePath` will "point to" the part of the data that had a validation
     error, and
   * `SchemaPath` will "point to" the part of the schema that raised the
     validation error.

In this case, `InstancePath` isn't very useful -- but it will become more useful
when we start validating more complicated inputs. `SchemaPath` already is making
some sense: it tells us that the `type` keyword was upset with the input. Which
makes sense: `type: string` expects a string, but we gave it a number.

## Step 2: Integrating `jtd` into your application

Already, it should be pretty clear that `jtd.Validate` is the main function
you'll want to use from the `jtd` module. Now, let's explore a way you can
integrate `jtd` into your application.

For the rest of this article, we're going to assume you're writing some sort of
HTTP server. We'll use the standard library's `net/http`, but nothing about
`jtd` is limited to `net/http` or HTTP in particular. You can use `jtd` anywhere
you can use JSON.

To make things simple, here's a minimal HTTP server with `net/http`:

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Person struct {
	Name            string
	FavoriteNumbers []float64
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		var person Person
		if err := decoder.Decode(&person); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(w, "error parsing body: %v\n", err)
			return
		}

		sum := 0.0
		for _, n := range person.FavoriteNumbers {
			sum += n
		}

		fmt.Fprintf(w, "%s's favorite numbers add up to %v\n", person.Name, sum)
	})

	http.ListenAndServe("localhost:8080", nil)
}
```

Run this with `go run main.go` and you can test it right away:

```bash
curl localhost:8080 -d '{"name": "John Doe", "favoriteNumbers": [1, 3.14, 42]}'
```

```text
John Doe's favorite numbers add up to 46.14
```

But what if someone inputs a string instead of a number? Let's change `3.14` to
`"3.14"`:

```bash
curl localhost:8080 -d '{"name": "John Doe", "favoriteNumbers": [1, "3.14", 42]}'
```

```text
error parsing body: json: cannot unmarshal string into Go struct field Person.FavoriteNumbers of type float64
```

A few things should begin to become clear with this error:

1. Go, out of the box, makes working with JSON data quite easy. It helps you
   make sure you don't process data that doesn't fit your schema. But:
2. The errors it produces aren't the most helpful. How are users supposed to
   know how to proceed with an error like `cannot unmarshal string into Go
   struct field Person.FavoriteNumbers of type float64`? It's not clear where
   they messed up, especially as `Person` grows more complex.
3. You will only ever give users a single validation error per request. If there
   are multiple problems with their request, they'll have to fix them one-by-one
   instead of getting all validation errors at once. This can be a
   less-than-ideal user experience.
4. If you give errors like these to your end-users, it's quite likely you won't
   be able to change your struct names afterwords. Users might end up depending
   on the exact format of your errors. This is known as [Hyrum's Law][hyrum].

JSON Typedef can help you produce more consistent and more helpful validation
errors than what `encoding/json` will give you. Let's define a JTD schema for
`Person`, and then use JTD's validation errors instead of `encoding/json`'s.

```go
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	jtd "github.com/jsontypedef/json-typedef-go"
)

// This JSON Typedef schema is equivalent to the Person struct below.
//
// You might notice that there's duplication / non-DRYness to writing both
// structs and JSON Typedef schemas for the same data. You can solve that by
// generating your Golang structs from your schemas, as described here:
//
// https://jsontypedef.com/docs/golang/code-generation
var personSchema jtd.Schema = jtd.Schema{
	Properties: map[string]jtd.Schema{
		"name": jtd.Schema{Type: jtd.TypeString},
		"favoriteNumbers": jtd.Schema{
			Elements: &jtd.Schema{Type: jtd.TypeFloat64},
		},
	},
}

type Person struct {
	Name            string
	FavoriteNumbers []float64
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// We're going to JSON-parse the body twice in this example, so we need to
		// read the bytes into a buffer. If you really want to avoid doing this,
		// consider instead using something like:
		//
		// https://github.com/mitchellh/mapstructure
		bodyData, err := ioutil.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "error reading body: %v\n", err)
			return
		}

		defer r.Body.Close()

		// First, read the body into arbitrary JSON.
		var body interface{}
		if err := json.Unmarshal(bodyData, &body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(w, "error parsing body: %v\n", err)
			return
		}

		// Next, see if there are any validation errors. Because personSchema
		// doesn't use "Ref", we're guaranteed that jtd.Validate will never error
		// out.
		validationErrors, _ := jtd.Validate(personSchema, body)
		if len(validationErrors) > 0 {
			// If there are validation errors, we'll use those as our error message.
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(validationErrors)
			return
		}

		// If jtd.Validate didn't return any errors, and personSchema and Person are
		// equivalent, then you're guaranteed that this json.Unmarshal will never
		// return an error.
		var person Person
		json.Unmarshal(bodyData, &person)

		sum := 0.0
		for _, n := range person.FavoriteNumbers {
			sum += n
		}

		fmt.Fprintf(w, "%s's favorite numbers add up to %v\n", person.Name, sum)
	})

	http.ListenAndServe("localhost:8080", nil)
}
```

So now, we get a specific, detailed error message telling us where the error was
in our request, and what part of the schema rejected the input:

```bash
# Note: we here pipe `curl` into `jq`, a tool which will pretty-print JSON.
curl localhost:8080 -d '{"name": "John Doe", "favoriteNumbers": [1, "3.14", 42]}' | jq
```

```go
[
  {
    "InstancePath": [
      "favoriteNumbers",
      "1"
    ],
    "SchemaPath": [
      "properties",
      "favoriteNumbers",
      "elements",
      "type"
    ]
  }
]
```

If you prefer to have a terser output than having every path segment split out
into its own element in an array, you can consider using a [JSON
Pointer](https://tools.ietf.org/html/rfc6901), a standardized way to do "paths"
for JSON.

JSON Pointer is dirt-simple to implement. Just add this:

```go
func NewJSONPointer(path []string) string {
	if len(path) == 0 {
		return ""
	}

	parts := []string{}
	for _, p := range path {
		// This ~0 and ~1 stuff is related to how JSON Pointer escapes "/" and "~".
		parts = append(parts, strings.ReplaceAll(strings.ReplaceAll(p, "~", "~0"), "/", "~1"))
	}

	return fmt.Sprintf("/%s", strings.Join(parts, "/"))
}

type ValidationError struct {
	InstancePath string `json:"instancePath"`
	SchemaPath   string `json:"schemaPath"`
}
```

And then, instead of doing:

```go
json.NewEncoder(w).Encode(validationErrors)
```

Return instead:

```go
res := []ValidationError{}
for _, e := range validationErrors {
  res = append(res, ValidationError{
    InstancePath: NewJSONPointer(e.InstancePath),
    SchemaPath:   NewJSONPointer(e.SchemaPath),
  })
}

json.NewEncoder(w).Encode(res)
```

And now you'll get some terser error messages, which might be easier to
understand:

```bash
curl localhost:8080 -d '{"name": "John Doe", "favoriteNumbers": [1, "3.14", 42]}' | jq
```

```json
[
  {
    "instancePath": "/favoriteNumbers/1",
    "schemaPath": "/properties/favoriteNumbers/elements/type"
  }
]
```

## Advanced usage

### Limiting errors returned

By default, `jtd.Validate` returns every error it finds. If you just care about
whether there are any errors at all, or if you can't show more than some number
of errors, then you can get better performance out of `jtd.Validate` using the
[`jtd.WithMaxErrors`][jtd-with-max-depth] option.

For example, we can take the previous example, but only every return at most one
error, by changing:

```go
validationErrors, _ := jtd.Validate(personSchema, body)
```

Into:

```go
validationErrors, _ := jtd.Validate(personSchema, body, jtd.WithMaxErrors(1))
```

### Handling untrusted schemas

If you're interested in using `jtd` to handle untrusted schemas -- for example,
if you're trying to validate data against a schema that you didn't write, then
you should take extra precautions to avoid Denial-of-Service attacks.

See ["Advanced Usage: Handling Untrusted Schemas"][jtd-gh-untrusted-schemas] in
the `jtd` README on GitHub for how you can safely handle untrusted schemas.

[jtd-go]: https://github.com/jsontypedef/json-typedef-go
[hyrum]: https://www.hyrumslaw.com/
[jtd-with-max-depth]: https://pkg.go.dev/github.com/jsontypedef/json-typedef-go?tab=doc#WithMaxDepth
[jtd-gh-untrusted-schemas]: https://github.com/jsontypedef/json-typedef-js#advanced-usage-handling-untrusted-schemas
