---
title: "Generating Java from JSON Typedef Schemas"
sidebar_label: "Code Generation"
---

JSON Type Definition is a schema language for JSON that's designed for code
generation. In this article, you'll learn:

* How to generate Java code from a JSON Typedef schema,
* How to use that generated code in your applications

## Prerequisite: Install `jtd-codegen`

The `jtd-codegen` tool generates code from JSON Typedef schemas. It supports
many languages, Java being one of them. To install `jtd-codegen`, you have a few
options:

### Install with Homebrew

This option is recommended if you're on macOS.

```bash
brew install jsontypedef/jsontypedef/jtd-codegen
```

### Install with Docker

This option is recommended on non-Mac platforms, or if you're running
`jtd-codegen` in some sort of script and you want to make sure that everyone
running the script uses the same version of `jtd-codegen`.

```bash
docker pull jsontypedef/jtd-tools
```

### Install with Cargo

This option is recommended if you already have `cargo` installed, or if you
would prefer to use a version of `jtd-codegen` compiled on your machine:

```bash
cargo install jtd-codegen
```

## Step 1: Write your schema

Before we can generate code from a JSON Typedef schema, we need a schema to work
with. There are a number of ways you can get ahold of a schema:

* You could write one yourself
* You could generate one from existing data, using a tool like
  [`jtd-infer`](/docs/tools/jtd-infer).

Let's assume, for the purposes of this article, that you want to make sure an
inputted JSON is a valid "user", where a user looks likething like this:

```json
{
  "id": "123",
  "firstName": "John",
  "lastName": "Doe",
  "favoriteNumbers": [1, 3.14, 42]
}
```

A JSON Typedef schema that can describe this sort of data looks like this:

```json
{
  "properties": {
    "id": { "type": "string" },
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "favoriteNumbers": {
      "elements": { "type": "float64" }
    }
  }
}
```

To follow along with this example, put that schema in a file called
`user.jtd.json` -- there's nothing special about the `.jtd.json` extension, but
it is the conventional file extension to use for JSON Typedef schemas.

## Step 2: Create a directory for your generated code

The `jtd-codegen` tool will always output code into a directory. Create a
directory for `jtd-codegen` to output into.

For this demo, let's make a directory called `user` inside the directory where
we keep our code:

```bash
mkdir src/main/java/com/example/user
```

We'll end up putting our generated code in a package called `com.example.user`
in the next step.

## Step 3: Call `jtd-codegen` with your schema

Next, all we need to do is invoke `jtd-codegen`, providing it with the schema
(in `user.jtd.json`) and the output directory. Here's how you do that:

```bash
jtd-codegen --java-out=src/main/java/com/example/user --java-pkg com.example.user -- user.jtd.json
```

And that's all you have to do! Inside
`src/main/java/com/example/user/User.java`, you should see something like this:

```java
package com.example.user;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class User {
    @JsonProperty("favoriteNumbers")
    private List<Double> favoriteNumbers;

    @JsonProperty("firstName")
    private String firstName;

    @JsonProperty("id")
    private String id;

    @JsonProperty("lastName")
    private String lastName;

    public User() {
    }

    public List<Double> getFavoriteNumbers() {
        return favoriteNumbers;
    }

    public void setFavoriteNumbers(List<Double> favoriteNumbers) {
        this.favoriteNumbers = favoriteNumbers;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
}
```

Try to play around with `user.jtd.json`, and then re-running `jtd-codegen`. Try
adding nested objects, and seeing how `jtd-codegen` behaves!

## Step 4: Integrating the generated code into your app

In the previous steps, we generated code from a JTD schema. But that's not very
useful on its own; what you *really* want to do is be able to use the generated
code in your application. In this section, we'll see how to do that.

`jtd-codegen`-generated code integrates in your app in a three-step process:

1. You accept some JSON input in whatever way makes sense for your application
   -- perhaps you read it from a file, from an HTTP request, or from STDIN.
   That's outside the scope of JSON Typedef's purview.

   To keep things super simple, we'll mostly omit this in this article. Instead,
   we'll just parse a hard-coded "input".

2. You validate the JSON input against a JSON Typedef schema. You can do this
   via the `com.jsontypedef.jtd:jtd` package.

   If you're unfamiliar with `jtd`, you can learn more about the details of this
   step in ["Validating JSON with JSON Typedef in Java"](/docs/java/validation).

3. Once the input is validated against the schema, you can confidently re-parse
   the input into the datatype generated by `jtd-codegen`. From there on out,
   you can write some beautiful, type-safe code.

Here's an example of an app that reads in some arbitrary JSON input, validates
it with `jtd`, and only returns a `User` if the input satisfies the schema;
otherwise, it'll raise an exception. If you've been following the example
`jtd-codegen` invocations up to here, this is all runnable code:

```java
package com.example;

import com.example.user.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jsontypedef.jtd.*;

import java.util.List;

public class App {
    public static void main(String[] args) {
        try {
            processInput("""
                    {
                        "id": "123",
                        "firstName": "John",
                        "lastName": "Doe",
                        "favoriteNumbers": [1, 3.14, 42]
                    }
                    """);
        } catch (Exception e) {
            System.out.println(e);
        }

        try {
            processInput("""
                    {
                        "id": "123",
                        "firstName": "John",
                        "lastName": "Doe",
                        "favoriteNumbers": [1, "3.14", 42]
                    }
                    """);
        } catch (Exception e) {
            System.out.println(e);
        }
    }
}


    // This is an example of a fake business-logic-y sort of method you might
    // write in your code.
    private static void processInput(String input) throws JsonSchemaException, MaxDepthExceededException, JsonProcessingException {
        User user = parseUser(input);
        double sum = 0;
        for (double n : user.getFavoriteNumbers()) {
            sum += n;
        }

        System.out.println(String.format("%s %s's favorite numbers add to %f",
                user.getFirstName(), user.getLastName(), sum));
    }

    // parseUser is an example of how you can first check the validity of
    // JSON data before attempting to create instances of your code-generated
    // classes.
    private static User parseUser(String input) throws JsonProcessingException, MaxDepthExceededException, JsonSchemaException {
        ObjectMapper objectMapper = new ObjectMapper();

        // Because this is just a demo, we're going to hard-code the schema
        // here.
        //
        // In real systems, you should consider reading the schema in ahead of
        // time from the same data you used to run jtd-codegen, that way you
        // have a single source of truth.
        Schema schema = objectMapper.readValue("""
                {
                    "properties": {
                        "id": { "type": "string" },
                        "firstName": { "type": "string" },
                        "lastName": { "type": "string" },
                        "favoriteNumbers": {
                            "elements": { "type": "float64" }
                        }
                    }
                }
                """, Schema.class);

        Validator validator = new Validator();
        JsonNode json = objectMapper.readTree(input);
        List<ValidationError> errors = validator.validate(schema,
                new JacksonAdapter(json));

        if (!errors.isEmpty()) {
            throw new JsonSchemaException(errors);
        }

        return objectMapper.treeToValue(json, User.class);
    }

    // JsonSchemaException is an example of how you can wrap jtd's validation
    // errors into your own exception class.
    private static class JsonSchemaException extends Exception {
        private List<ValidationError> errors;

        public JsonSchemaException(List<ValidationError> errors) {
            this.errors = errors;
        }

        public List<ValidationError> getErrors() {
            return errors;
        }

        @Override
        public String toString() {
            return "JsonSchemaException{" +
                    "errors=" + errors +
                    '}';
        }
    }
}
```

When the input is good, we can process it in a type-safe way. When the input is
bad, we get a specific, portable set of errors that we can return to the user.
