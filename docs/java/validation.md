---
title: "Validating JSON in Java with JSON Typedef"
sidebar_label: "Validation"
---

> This article is about JSON Typedef *validation* with Java. If instead you're
> interested in JSON Typedef *code generation* with Java, see the next article,
> ["Generating Java from JSON Typedef Schemas"](java/code-generation.md).

JSON Typedef is a schema language for JSON: it lets you describe the shape of
your JSON data in a portable way, and from that you can validate data and
generate datatypes from your schemas.

This article will explain how you can validate JSON using JSON Typedef in Java.
If you're familiar with Scala, Kotlin, Clojure, or other JVM-based languages,
you can call the Java APIs described in this article as you usually do.

If you're unfamiliar with the syntax of JSON Typedef schemas, you may want to
first read ["Learn JSON Typedef"](getting-started/learn-json-typedef.md). That
said, JSON Typedef is pretty straightfoward, and you can probably guess what
most schemas in this article do without consulting that article.

## Step 1: Install the `jtd` package

The recommended Java implementation of JSON Typedef is [the `jtd` artifact from
`com.jsontypedef.jtd`][jtd-gh]. If you're using gradle, you can do this in your
`build.gradle`:

```groovy
dependencies {
  implementation 'com.jsontypedef.jtd:jtd:0.2.2'
}
```

Or, if you're using Maven, add this to your `pom.xml`:

```xml
<dependency>
  <groupId>com.jsontypedef.jtd</groupId>
  <artifactId>jtd</artifactId>
  <version>0.2.2</version>
</dependency>
```

Right away, we can try playing around with `jtd`. I'm going to set up a dummy
`App.java` with a `main` that I'll call myself.

```java
package com.example;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.jsontypedef.jtd.JacksonAdapter;
import com.jsontypedef.jtd.MaxDepthExceededException;
import com.jsontypedef.jtd.Schema;
import com.jsontypedef.jtd.Validator;

public class App {
    public static void main(String[] args) throws JsonProcessingException, MaxDepthExceededException {
        String schemaJson = "{ \"type\": \"string\" }";
        String inputJson = "\"hello, world!\"";

        ObjectMapper objectMapper = new ObjectMapper();
        Schema schema = objectMapper.readValue(schemaJson, Schema.class);
        JsonNode input = objectMapper.readTree(inputJson);

        Validator validator = new Validator();
        System.out.println(validator.validate(schema, new JacksonAdapter(input)));
    }
}
```

This outputs:

```text
[]
```

The `Validator.validate()` function returns a `List` of validation errors. But
if you validate `"hello, world!"` against the JSON Typedef schema `{ "type":
"string" }`, there are no validation errors -- the data is ok! So `validate()`
returns an empty list.

Let's try out some invalid data, by changing `inputJson`:

```java
package com.example;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.jsontypedef.jtd.JacksonAdapter;
import com.jsontypedef.jtd.MaxDepthExceededException;
import com.jsontypedef.jtd.Schema;
import com.jsontypedef.jtd.Validator;

public class App {
    public static void main(String[] args) throws JsonProcessingException, MaxDepthExceededException {
        String schemaJson = "{ \"type\": \"string\" }";
        String inputJson = "42";

        ObjectMapper objectMapper = new ObjectMapper();
        Schema schema = objectMapper.readValue(schemaJson, Schema.class);
        JsonNode input = objectMapper.readTree(inputJson);

        Validator validator = new Validator();
        System.out.println(validator.validate(schema, new JacksonAdapter(input)));
    }
}
```

This outputs:

```text
[ValidationError [instancePath=[], schemaPath=[type]]]
```

This time, `validate()` gave us back a list with one element inside of it. Every
element of the array `validate()` returns will always have two properties:

* `instancePath` will "point to" the part of the data that had a validation
  error, and
* `schemaPath` will "point to" the part of the schema that raised the validation
  error.

In this case, `instancePath` isn't very useful -- but it will become more useful
when we start validating more complicated inputs. `schemaPath` already is making
some sense: it tells us that the `type` keyword was upset with the input. Which
makes sense: `type: string` expects a string, but we gave it a number.

## Step 2: Integrating `jtd` into your application

Already, it should be pretty clear that `jtd.validate` is the main function
you'll want to use from the `jtd` package. Now, let's explore a way you can
integrate `jtd` into your application.

For the rest of this article, we're going to assume you're writing some sort of
HTTP server. We'll use the standard library's
[`com.sun.net.httpserver`](https://docs.oracle.com/javase/8/docs/jre/api/net/httpserver/spec/com/sun/net/httpserver/package-summary.html),
but nothing about `jtd` is limited to this particular package or HTTP in
particular. You can use `jtd` anywhere you can use JSON.

To make things simple, here's a minimal HTTP server with
`com.sun.net.httpserver`:

```java
package com.example;

import java.util.List;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class App {
    public static void main(String[] args) throws IOException {
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("localhost", 8080), 0);
        httpServer.createContext("/", new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                try {
                    String response = App.sumFavoriteNumbers(exchange.getRequestBody());

                    exchange.sendResponseHeaders(200, response.length());
                    exchange.getResponseBody().write(response.getBytes());
                } catch (Exception e) {
                    String response = e.toString();

                    exchange.sendResponseHeaders(400, response.length());
                    exchange.getResponseBody().write(response.getBytes());
                } finally {
                    exchange.close();
                }
            }
        });

        httpServer.start();
    }

    private static String sumFavoriteNumbers(InputStream in) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        Person person = objectMapper.readValue(in, Person.class);

        double sum = 0;
        for (double number : person.favoriteNumbers) {
            sum += number;
        }

        return String.format("%s's favorite numbers add up to %f", person.name, sum);
    }

    private static class Person {
        public String name;
        public List<Double> favoriteNumbers;
    }
}
```

Once you run this, you can test it right away:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, 3.14, 42] }'
```

```text
John Doe's favorite numbers add up to 46.140000
```

But what if someone inputs a string instead of a number? Let's change `3.14` to
`"3.14"`:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }'
```

```text
John Doe's favorite numbers add up to 46.140000
```

It turns out Jackson, the JSON library we're using, is quite leninent, and lets
this slide; it tries to parse what should have been a number from a string. But
if we do something irreparably wrong, like this:

```bash
curl localhost:8080 -d '{"name": "John Doe", "favoriteNumbers": [1, "3.14", "fourtytwo"]}'
```

```text
com.fasterxml.jackson.databind.exc.InvalidFormatException: Cannot deserialize value of type `java.lang.Double` from String "fourtytwo": not a valid Double value
 at [Source: (sun.net.httpserver.FixedLengthInputStream); line: 1, column: 53] (through reference chain: com.example.App$Person["favoriteNumbers"]->java.util.ArrayList[2])
```

A few things should begin to become clear with these examples:

1. Java with Jackson, out of the box, makes working with JSON data quite easy.
   It helps you make sure you don't process data that is wildly incompatible
   with your schema. But:

2. The errors it produces aren't the most helpful. How are users supposed to
   know how to proceed with an error like `Cannot deserialize value of type
   `java.lang.Double` from String "fourtytwo": not a valid Double value`? It's
   not clear where they messed up, especially as `Person` grows more complex.

3. You will only ever give users a single validation error per request. If there
   are multiple problems with their request, they'll have to fix them one-by-one
   instead of getting all validation errors at once. This can be a
   less-than-ideal user experience.

4. If you give errors like these to your end-users, it's quite likely you won't
   be able to change your struct names afterwords. Users might end up depending
   on the exact format of your errors. This is known as [Hyrum's Law][hyrum].

JSON Typedef can help you produce more consistent and more helpful validation
errors than what you get out of the box. Let's define a JTD schema for `Person`,
and then use JTD's validation errors instead of Jackson's:

```java
private static String sumFavoriteNumbers(InputStream in) throws IOException, MaxDepthExceededException {
    ObjectMapper objectMapper = new ObjectMapper();

    // Just to keep the example here simple, we're going to parse a Schema
    // from JSON.
    //
    // You might notice that there's duplication / non-DRYness to writing
    // both classes and JSON Typedef schemas for the same data. You can
    // solve that by generating your Java classes from your schemas, as
    // described here:
    //
    // https://jsontypedef.com/docs/java/code-generation
    Schema schema = objectMapper.readValue(
        "{ \"properties\": { \"name\": { \"type\": \"string\" }, \"favoriteNumbers\": { \"elements\": { \"type\": \"float64\" }}}}",
        Schema.class
    );

    // First, read the body into arbitrary JSON.
    JsonNode inJson = objectMapper.readTree(in);

    // Next, see if there are any validation errors.
    Validator validator = new Validator();
    List<ValidationError> validationErrors = validator.validate(schema, new JacksonAdapter(inJson));

    // If there are any errors, return those.
    //
    // Because this is just a demo, we'll live with this returning just a
    // 200 response. In the real world, you'd typically lean into your web
    // framework's preferred manner of doing HTTP errors.
    if (!validationErrors.isEmpty()) {
        return "Validation errors";
    }

    // Now, instead of reading from "in" (the InputStream), we'll read from
    // "inJson", the parsed JsonNode. That way we don't need to re-parse the
    // JSON.
    Person person = objectMapper.treeToValue(inJson, Person.class);

    double sum = 0;
    for (double number : person.favoriteNumbers) {
        sum += number;
    }

    return String.format("%s's favorite numbers add up to %f", person.name, sum);
}
```

> For your reference, the all-in-one-line string in the above example is this
> JSON Typedef schema:
>
> ```json
> {
>   "properties": {
>     "name": { "type": "string" },
>     "favoriteNumbers": {
>       "elements": { "type": "float64" }
>     }
>   }
> }
> ```

Now if we try the same `3.14` changed to `"3.14"`, we get a validation error
instead of duck-typing the user's input:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }'
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

```java
if (!validationErrors.isEmpty()) {
    return "Validation errors";
}
```

Into:

```java
if (!validationErrors.isEmpty()) {
    return objectMapper.writeValueAsString(validationErrors);
}
```

So now, we get a specific, detailed error message telling us where the error was
in our request, and what part of the schema rejected the input:

```bash
# Note: we here pipe `curl` into `jq`, a tool which will pretty-print JSON.
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' | jq
```

```json
[
  {
    "instancePath": [
      "favoriteNumbers",
      "1"
    ],
    "schemaPath": [
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

JSON Pointer is dirt-simple to implement. We'll add a little function that
builds JSON Pointers:

```java
private static String toJsonPointer(List<String> tokens) {
    if (tokens.isEmpty()) {
        return "";
    }

    String out = "";
    for (String token : tokens) {
        // This ~0 and ~1 stuff is related to how JSON Pointer escapes "/" and "~".
        out += "/" + token.replaceAll("~", "~0").replaceAll("/", "~1");
    }

    return out;
}
```

And a little class to hold our JSON Pointers:

```java
private static class JsonPointerValidationError {
    public String instancePath;
    public String schemaPath;
}
```

And then, instead of returning:

```java
return objectMapper.writeValueAsString(validationErrors);
```

Return instead:

```java
List<JsonPointerValidationError> out = new ArrayList<>();
for (ValidationError e : validationErrors) {
    JsonPointerValidationError outErr = new JsonPointerValidationError();
    outErr.instancePath = toJsonPointer(e.getInstancePath());
    outErr.schemaPath = toJsonPointer(e.getSchemaPath());

    out.add(outErr);
}

return objectMapper.writeValueAsString(out);
```

And now you'll get some terser error messages, which might be easier to
understand:

```bash
curl localhost:8080 -d '{ "name": "John Doe", "favoriteNumbers": [1, "3.14", 42] }' -H "Content-Type: application/json" | jq
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

This section discusses some fancier use-cases you can implement with `jtd`.

### Limiting errors returned

By default, `Validator.validate()` returns every error it finds. If you just
care about whether there are any errors at all, or if you can't show more than
some number of errors, then you can get better performance out of `Validator`
using the `maxErrors` option.

For example, we can take the previous example, but only every return at most one
error, by changing:

```java
Validator validator = new Validator();
```

Into:

```java
Validator validator = new Validator();
validator.setMaxErrors(1);
```

### Handling untrusted schemas

If you're interested in using `jtd` to handle untrusted schemas -- for example,
if you're trying to validate data against a schema that you didn't write, then
you should take extra precautions to avoid Denial-of-Service attacks.

See ["Advanced Usage: Handling Untrusted Schemas"][jtd-gh-untrusted-schemas] in
the `jtd` README on GitHub for how you can safely handle untrusted schemas.

[jtd-gh]: https://github.com/jsontypedef/json-typedef-java
[jtd-gh-untrusted-schemas]: https://github.com/jsontypedef/json-typedef-java#advanced-usage-handling-untrusted-schemas
[hyrum]: https://www.hyrumslaw.com/
