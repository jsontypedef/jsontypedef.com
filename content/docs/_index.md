---
# Note: this is the only page in /docs that needs to specify "prose" itself.
# This is because it's the only page that wants to temporarily *escape* prose,
# because we want to special-case the pretty article selector on this page.
title: JSON Typedef Documentation
---

<div class="prose prose-green">

# JSON Typedef Documentation

Welcome to the JSON Typedef online documentation!

JSON Type Definition, aka [RFC 8927](https://tools.ietf.org/html/rfc8927), is an
easy-to-learn, standardized way to define a schema for JSON data. You can use
JSON Typedef to portably validate data across programming languages, create
dummy data, generate code, and more.

Here, you will find articles teaching you how JSON Typedef works, and how you
can use it in your own applications. To start with, here are some recommended
articles if you're just getting started:

</div>

<section class="mt-8 mb-8 flex flex-col lg:flex-row lg:space-x-4 text-white">
    <div class="lg:w-full p-4 rounded-lg bg-gradient-to-br from-blue-500 to-green-500">
        <h2 class="text-xl font-semibold">Learn JTD Quickly</h2>
        <span class="block mt-4">
            Everything you need to know about JTD, explained briskly.
        </span>
        <a href="/docs/jtd-in-5-minutes" class="mt-6 bg-green-800 bg-opacity-50 hover:bg-opacity-75 transition-colors duration-200 rounded-xl font-semibold py-2 px-4 inline-flex items-center">
            JTD in 5 Minutes
            <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </a>
    </div>
    <div class="lg:w-full p-4 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
        <h2 class="text-xl font-semibold">Start Validating</h2>
        <span class="block mt-4">
            Start using JTD in your preferred programming language.
        </span>
        <a href="/docs/jtd-in-5-minutes" class="mt-6 bg-purple-800 bg-opacity-50 hover:bg-opacity-75 transition-colors duration-200 rounded-xl font-semibold py-2 px-4 inline-flex items-center">
            Implementations
            <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </a>
    </div>
    <div class="lg:w-full p-4 rounded-lg bg-gradient-to-br from-yellow-500 to-red-500">
        <h2 class="text-xl font-semibold">Generate Code</h2>
        <span class="block mt-4">
            Convert a JTD schema into native types in your programming language.
        </span>
        <a href="/docs/jtd-in-5-minutes" class="mt-6 bg-red-800 bg-opacity-50 hover:bg-opacity-75 transition-colors duration-200 rounded-xl font-semibold py-2 px-4 inline-flex items-center">
            jtd-codegen
            <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </a>
    </div>
</section>

<div class="prose prose-green">

The three articles above are recommended because they cover the main way JSON
Type Definition is typically used:

1. First, you describe your data by writing a JTD schema. That's what [JTD in 5
   Minutes](/docs/jtd-in-5-minutes) is all about.

2. Then, you validate inputs against that schema. For that, you'll usually need
   one of the libraries listed in [Implementations](/docs/implementations).

3. Once you do the runtime checking of JSON inputs, you want to deserialize that
   validated input into a native type. That's where
   [jtd-codegen](/docs/jtd-codegen) comes in: it maps what a JTD schema can
   check into the corresponding static type in your programming language.

These are by no means the only way to use JSON Typedef. Other topics covered by
this documentation include:

* Guidance on how to use tooling around JSON Typedef, such as:

    * [`jtd-infer`](/docs/jtd-infer), which can generate a schema from examples
      of your data.

    * [`jtd-fuzz`](/docs/jtd-fuzz), which can generate mock data from a schema.

    * [`jtd-validate`](/docs/jtd-validate), which you can use to validate data
      from the command-line, or in shell scripts.

* Explanations and best practices around more advanced use-cases for JSON Type
  Definition, such as:

  * [How to use JTD's portable validation errors](/docs/validation-errors).

  * [How to embed JTD in your custom tooling](/docs/embedding-jtd).

  * [How to make your own JTD implementation](/docs/implement-jtd).

All of the docs you see here are open-source and maintained on GitHub. Please
open an issue or pull request on [the jsontypedef.com
repo](https://github.com/jsontypedef/jsontypedef.com) if you have questions or
suggestions!

</div>
