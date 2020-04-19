---
title: "Inferring a JSON Typedef Schema from Real Data"
sidebar_label: "jtd-infer"
---

JSON Type Definition is a JSON schema language. It lets you define the shape of
your JSON data, portably validate data against your schemas, and generate code
from your schemas.

This article is an introduction to [`jtd-infer`][jtd-infer], a command-line tool
that can generate a JSON Typedef schema from example data. In this article,
you'll learn:

1. How to use `jtd-infer` to quickly get started with JSON Typedef
2. How to use `jtd-infer`'s more advanced features to improve the schemas it
   generates.
3. How to use `jtd-infer` with complex data sets. In particular, you'll see how
   to use `jtd-infer` with a complex API like GitHub's REST API.

## Prerequisite: Install `jtd-infer`

To install `jtd-infer`, you have a few options:

### Install with Homebrew

This option is recommended if you're on macOS.

```bash
brew install jsontypedef/jsontypedef/jtd-infer
```

### Install with Docker

This option is recommended on non-Mac platforms, or if you're running
`jtd-infer` in some sort of script and you want to make sure that everyone
running the script uses the same version of `jtd-infer`.

```bash
docker pull jsontypedef/jtd-tools
```

If you install `jtd-infer` with Docker, you will need to invoke `jtd-infer`
slightly differently. When examples in this article suggest running:

```bash
jtd-infer ...
```

You should instead run:

```bash
docker exec -it jsontypedef/jtd-tools /jtd-infer ...
```

### Install with Cargo

This option is recommended if you already have `cargo` installed, or if you
would prefer to use a version of `jtd-infer` compiled on your machine:

```bash
cargo install jtd-infer
```

## Step 1: Infer a schema from an example

At its core, `jtd-infer` is a tool that reads in some JSON payloads, and spits
out a JSON Typedef schema that would accept all of those payloads. `jtd-infer`
tries to give you the most specific possible schema that would work.

So for example, if you have data like this in a file called `examples.json`:

```json
{ "name": "john doe", "age": 42, "favoriteNumbers": [1, 3.14, 42] }
```

Then you can run `jtd-infer examples.json` to get a schema from that data:

```bash
jtd-infer examples.json | jq
```

```json
{
  "properties": {
    "age": {
      "type": "uint8"
    },
    "name": {
      "type": "string"
    },
    "favoriteNumbers": {
      "elements": {
        "type": "float64"
      }
    }
  }
}
```

So far, `examples.json` only contains a single piece of data. Let's add a second
example:

```json
{ "name": "john doe", "age": 42, "favoriteNumbers": [1, 3.14, 42] }
{ "name": "jane doe", "favoriteNumbers": [] }
```

Notice that in this second example, we left out `age`. Let's see what
`jtd-infer` does:

```bash
jtd-infer examples.json | jq
```

```json
{
  "properties": {
    "name": {
      "type": "string"
    },
    "favoriteNumbers": {
      "elements": {
        "type": "float64"
      }
    }
  },
  "optionalProperties": {
    "age": {
      "type": "uint8"
    }
  }
}
```

Because `age` was missing in at least one of the examples, `jtd-infer` concluded
it was an optional property.

Feel free to experiment from here -- try making up your own examples, and seeing
what `jtd-infer` generates!

## Step 2: Using hints to improve `jtd-infer`'s output

`jtd-infer` is deterministic, and does not try to use statistical methods or
anything complicated like that in order to guess what your data's schema is.
Instead, if you want to customize what data `jtd-infer` generates, you should
give it some hints.

Hints are just command-line flags you pass to `jtd-infer` that suggests to
`jtd-infer` that it should generate a particular kind of schema for part of your
example data. In particular:

* `--enum-hint=/path/to/enum` tells `jtd-infer` to generate an `enum` schema,
  instead of a `type` schema, for a particular part of your input that's a
  string.

  The path you provide to `--enum-hint` should point to a string in your example
  data.

* `--values-hint=/path/to/hashmap-like_data` tells `jtd-infer` to generate a
  `values` schema, instead of a `properties` schema, for a part of your input
  data.

  The path you provide to `--values-hint` should point to an object in your
  example data.

* `--discriminator-hint=/path/to/message-type_tag` tells `jtd-infer` to generate
  a `discriminator` schema, instead of a `properties` schema, for a part of your
  input data.

  The path you provide to `--discriminator-hint` should point to a string
  property in your example data. That property will be used as a
  `discriminator`.

If you don't give `jtd-infer` a `--enum-hint`, `--values-hint`, or
`--discriminator-hint`, it will never generate any `enum`, `values`, or
`discriminator` schemas. This is on purpose: `jtd-infer` is designed to be
predictable, and so it will always generate what you usually want (`type` rather
than `enum`, `properties` rather than `values`/`discriminator`), rather than
somewhat unpredictably generate something else.

### Using `--enum-hint`

You should use `--enum-hint` for pieces of data that are strings, and there
aren't many values that string can take on. For example, if you have data like
this:

```json
{ "name": "john doe", "role": "READ_ONLY" }
{ "name": "jane doe", "role": "READ_ONLY" }
{ "name": "john q public", "role": "ADMIN" }
```

By default, `jtd-infer` will infer that `role` is just a string:

```bash
jtd-infer examples.json | jq
```

```json
{
  "properties": {
    "role": {
      "type": "string"
    },
    "name": {
      "type": "string"
    }
  }
}
```

But if you tell `jtd-infer` that `role` is an enum, you'll get:

```bash
jtd-infer --enum-hint=/role examples.json | jq
```

```json
{
  "properties": {
    "name": {
      "type": "string"
    },
    "role": {
      "enum": [
        "ADMIN",
        "READ_ONLY"
      ]
    }
  }
}
```

### Using `--values-hint`

You should use `--values-hint` for pieces of data where a JSON object is
behaving more like a map/dictionary than like a struct. For example, if you have
data like this:

```json
{ "ec2_instance_id": "i-123", "tags": { "product_area": "security", "owner": "security@acme.org" }}
{ "ec2_instance_id": "i-456", "tags": {}}
{ "ec2_instance_id": "i-123", "tags": { "cost_center": "web", "owner_email": "web@acme.org" }}
```

In these examples, `tags` is just a free-form set of key/value pairs. It doesn't
have a very predictable structure in terms of what keys might be present. If you
run `jtd-infer` without `--values-hint` on this data, you'll get:

```bash
jtd-infer examples.json
```

```json
{
  "properties": {
    "tags": {
      "optionalProperties": {
        "owner": {
          "type": "string"
        },
        "product_area": {
          "type": "string"
        },
        "owner_email": {
          "type": "string"
        },
        "cost_center": {
          "type": "string"
        }
      }
    },
    "ec2_instance_id": {
      "type": "string"
    }
  }
}
```

That's not quite what we want. Instead, let's tell `jtd-infer` that the
top-level `tags` field is better represented as a `values` schema:

```bash
jtd-infer --values-hint=/tags examples.json | jq
```

```json
{
  "properties": {
    "ec2_instance_id": {
      "type": "string"
    },
    "tags": {
      "values": {
        "type": "string"
      }
    }
  }
}
```

Much better!

If the path to your `values` data isn't predictable -- for example, if they're
in an array, then you can use `-` as a "wildcard" path segment. For example, if
you have data like this:

```json
{
  "team": "security",
  "instances": [
    { "id": "i-123", "tags": {"foo": "foo"} },
    { "id": "i-456", "tags": {"bar": "bar"} }
  ]
}
{
  "team": "web",
  "instances": [
    { "id": "i-789", "tags": {"baz": "baz"} }
  ]
}
```

To get `jtd-infer` to try to generate a `values` schema for `instances.*.tags`,
pass in a path of `/instances/-/tags`:

```bash
jtd-infer --values-hint=/instances/-/tags examples.json | jq
```

```json
{
  "properties": {
    "team": {
      "type": "string"
    },
    "instances": {
      "elements": {
        "properties": {
          "id": {
            "type": "string"
          },
          "tags": {
            "values": {
              "type": "string"
            }
          }
        }
      }
    }
  }
}
```

### Using `--discriminator-hint`

You should use `--discriminator-hint` for pieces of data where a JSON object has
a special "type" property that tells you what the rest of the JSON object will
contain. For example, data like this:

```json
{ "event": "Products Searched", "query": "running shoes" }
{ "event": "Products Searched", "query": "headband" }
{ "event": "Promotion Viewed", "promotion_id": "summer_sale_2" }
{ "event": "Promotion Viewed", "promotion_id": "new_customer_discount" }
```

If you run `jtd-infer` without any hints on this data, you'll get:

```bash
jtd-infer examples.json | jq
```

```json
{
  "properties": {
    "event": {
      "type": "string"
    }
  },
  "optionalProperties": {
    "query": {
      "type": "string"
    },
    "promotion_id": {
      "type": "string"
    }
  }
}
```

This makes sense, but it isn't ideal. As we add more `event` types, we're going
to get more and more optional properties. Instead, we should use a
`discriminator` schema, and have a separate schema based on the value of
`event`.

To get `jtd-infer` to generate a `discriminator` schema, pass a
`--discriminator-hint`, and point it at the special "type" property. In this
case, `event` is the special property:

```bash
jtd-infer --discriminator-hint=/event examples.json | jq
```

```json
{
  "discriminator": "event",
  "mapping": {
    "Products Searched": {
      "properties": {
        "query": {
          "type": "string"
        }
      }
    },
    "Promotion Viewed": {
      "properties": {
        "promotion_id": {
          "type": "string"
        }
      }
    }
  }
}
```

If the path to your `discriminator` data isn't predictable -- for example, if
they're in an array, then you can use `-` as a "wildcard" path segment. For
example, if you have data like this:

```json
{ "batch_id": "123", "events": [{ "event": "Products Searched", "query": "running shoes" }] }
{ "batch_id": "456", "events": [{ "event": "Products Searched", "query": "headband" }, { "event": "Promotion Viewed", "promotion_id": "summer_sale_2" }]}
{ "batch_id": "789", "events": [{ "event": "Promotion Viewed", "promotion_id": "new_customer_discount" }]}
```

To get `jtd-infer` to try to generate a `discriminator` schema based off of
`events.*.event`, pass in a path of `/events/-/event`:

```bash
jtd-infer --discriminator-hint=/events/-/event examples.json | jq
```

```json
{
  "properties": {
    "batch_id": {
      "type": "string"
    },
    "events": {
      "elements": {
        "discriminator": "event",
        "mapping": {
          "Products Searched": {
            "properties": {
              "query": {
                "type": "string"
              }
            }
          },
          "Promotion Viewed": {
            "properties": {
              "promotion_id": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}
```

## Step 3: Using `jtd-infer` with complex data sets

In this section, we'll explore `jtd-infer` with some complex, real-world data.
We're going to use `jtd-infer` to describe two of GitHub's REST API endpoints:

* [`GET /repos/:owner/:repo`](https://developer.github.com/v3/repos/#get-a-repository)
* [`GET /repos/:owner/:repo/events`](https://developer.github.com/v3/activity/events/#list-repository-events)

We'll use Ruby on Rails (`rails/rails`) as our test subject, because it's a very
active GitHub repo.

### Describing `GET /repos/:owner/:repo`

For starters, here's what kind of data the `GET /repos/:owner/:repo` endpoint
returns:

```bash
curl https://api.github.com/repos/rails/rails | jq
```

```json
{
  "id": 8514,
  "node_id": "MDEwOlJlcG9zaXRvcnk4NTE0",
  "name": "rails",
  "full_name": "rails/rails",
  "private": false,
  "owner": {
    "login": "rails",
    "id": 4223,
    "node_id": "MDEyOk9yZ2FuaXphdGlvbjQyMjM=",
    "avatar_url": "https://avatars1.githubusercontent.com/u/4223?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/rails",
    "html_url": "https://github.com/rails",
    "followers_url": "https://api.github.com/users/rails/followers",
    "following_url": "https://api.github.com/users/rails/following{/other_user}",
    "gists_url": "https://api.github.com/users/rails/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/rails/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/rails/subscriptions",
    "organizations_url": "https://api.github.com/users/rails/orgs",
    "repos_url": "https://api.github.com/users/rails/repos",
    "events_url": "https://api.github.com/users/rails/events{/privacy}",
    "received_events_url": "https://api.github.com/users/rails/received_events",
    "type": "Organization",
    "site_admin": false
  },
  "html_url": "https://github.com/rails/rails",
  "description": "Ruby on Rails",
  "fork": false,
  "url": "https://api.github.com/repos/rails/rails",
  "forks_url": "https://api.github.com/repos/rails/rails/forks",
  "keys_url": "https://api.github.com/repos/rails/rails/keys{/key_id}",
  "collaborators_url": "https://api.github.com/repos/rails/rails/collaborators{/collaborator}",
  "teams_url": "https://api.github.com/repos/rails/rails/teams",
  "hooks_url": "https://api.github.com/repos/rails/rails/hooks",
  "issue_events_url": "https://api.github.com/repos/rails/rails/issues/events{/number}",
  "events_url": "https://api.github.com/repos/rails/rails/events",
  "assignees_url": "https://api.github.com/repos/rails/rails/assignees{/user}",
  "branches_url": "https://api.github.com/repos/rails/rails/branches{/branch}",
  "tags_url": "https://api.github.com/repos/rails/rails/tags",
  "blobs_url": "https://api.github.com/repos/rails/rails/git/blobs{/sha}",
  "git_tags_url": "https://api.github.com/repos/rails/rails/git/tags{/sha}",
  "git_refs_url": "https://api.github.com/repos/rails/rails/git/refs{/sha}",
  "trees_url": "https://api.github.com/repos/rails/rails/git/trees{/sha}",
  "statuses_url": "https://api.github.com/repos/rails/rails/statuses/{sha}",
  "languages_url": "https://api.github.com/repos/rails/rails/languages",
  "stargazers_url": "https://api.github.com/repos/rails/rails/stargazers",
  "contributors_url": "https://api.github.com/repos/rails/rails/contributors",
  "subscribers_url": "https://api.github.com/repos/rails/rails/subscribers",
  "subscription_url": "https://api.github.com/repos/rails/rails/subscription",
  "commits_url": "https://api.github.com/repos/rails/rails/commits{/sha}",
  "git_commits_url": "https://api.github.com/repos/rails/rails/git/commits{/sha}",
  "comments_url": "https://api.github.com/repos/rails/rails/comments{/number}",
  "issue_comment_url": "https://api.github.com/repos/rails/rails/issues/comments{/number}",
  "contents_url": "https://api.github.com/repos/rails/rails/contents/{+path}",
  "compare_url": "https://api.github.com/repos/rails/rails/compare/{base}...{head}",
  "merges_url": "https://api.github.com/repos/rails/rails/merges",
  "archive_url": "https://api.github.com/repos/rails/rails/{archive_format}{/ref}",
  "downloads_url": "https://api.github.com/repos/rails/rails/downloads",
  "issues_url": "https://api.github.com/repos/rails/rails/issues{/number}",
  "pulls_url": "https://api.github.com/repos/rails/rails/pulls{/number}",
  "milestones_url": "https://api.github.com/repos/rails/rails/milestones{/number}",
  "notifications_url": "https://api.github.com/repos/rails/rails/notifications{?since,all,participating}",
  "labels_url": "https://api.github.com/repos/rails/rails/labels{/name}",
  "releases_url": "https://api.github.com/repos/rails/rails/releases{/id}",
  "deployments_url": "https://api.github.com/repos/rails/rails/deployments",
  "created_at": "2008-04-11T02:19:47Z",
  "updated_at": "2020-04-18T19:09:51Z",
  "pushed_at": "2020-04-18T14:53:45Z",
  "git_url": "git://github.com/rails/rails.git",
  "ssh_url": "git@github.com:rails/rails.git",
  "clone_url": "https://github.com/rails/rails.git",
  "svn_url": "https://github.com/rails/rails",
  "homepage": "https://rubyonrails.org",
  "size": 225333,
  "stargazers_count": 45401,
  "watchers_count": 45401,
  "language": "Ruby",
  "has_issues": true,
  "has_projects": false,
  "has_downloads": true,
  "has_wiki": false,
  "has_pages": false,
  "forks_count": 18358,
  "mirror_url": null,
  "archived": false,
  "disabled": false,
  "open_issues_count": 602,
  "license": {
    "key": "mit",
    "name": "MIT License",
    "spdx_id": "MIT",
    "url": "https://api.github.com/licenses/mit",
    "node_id": "MDc6TGljZW5zZTEz"
  },
  "forks": 18358,
  "open_issues": 602,
  "watchers": 45401,
  "default_branch": "master",
  "temp_clone_token": null,
  "organization": {
    "login": "rails",
    "id": 4223,
    "node_id": "MDEyOk9yZ2FuaXphdGlvbjQyMjM=",
    "avatar_url": "https://avatars1.githubusercontent.com/u/4223?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/rails",
    "html_url": "https://github.com/rails",
    "followers_url": "https://api.github.com/users/rails/followers",
    "following_url": "https://api.github.com/users/rails/following{/other_user}",
    "gists_url": "https://api.github.com/users/rails/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/rails/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/rails/subscriptions",
    "organizations_url": "https://api.github.com/users/rails/orgs",
    "repos_url": "https://api.github.com/users/rails/repos",
    "events_url": "https://api.github.com/users/rails/events{/privacy}",
    "received_events_url": "https://api.github.com/users/rails/received_events",
    "type": "Organization",
    "site_admin": false
  },
  "network_count": 18358,
  "subscribers_count": 2539
}
```

There aren't any `values` or `discriminator`-like pieces of data with this
endpoint, so `jtd-infer` should work out of the box:

```bash
curl https://api.github.com/repos/rails/rails | jtd-infer | jq
```

```json
{
  "properties": {
    "subscribers_url": {
      "type": "string"
    },
    "archive_url": {
      "type": "string"
    },
    "open_issues_count": {
      "type": "uint16"
    },
    "watchers_count": {
      "type": "uint16"
    },
    "compare_url": {
      "type": "string"
    },
    "pulls_url": {
      "type": "string"
    },
    "downloads_url": {
      "type": "string"
    },
    "commits_url": {
      "type": "string"
    },
    "milestones_url": {
      "type": "string"
    },
    "issue_comment_url": {
      "type": "string"
    },
    "releases_url": {
      "type": "string"
    },
    "created_at": {
      "type": "timestamp"
    },
    "merges_url": {
      "type": "string"
    },
    "clone_url": {
      "type": "string"
    },
    "pushed_at": {
      "type": "timestamp"
    },
    "git_refs_url": {
      "type": "string"
    },
    "git_url": {
      "type": "string"
    },
    "private": {
      "type": "boolean"
    },
    "temp_clone_token": {},
    "watchers": {
      "type": "uint16"
    },
    "owner": {
      "properties": {
        "received_events_url": {
          "type": "string"
        },
        "id": {
          "type": "uint16"
        },
        "gravatar_id": {
          "type": "string"
        },
        "starred_url": {
          "type": "string"
        },
        "following_url": {
          "type": "string"
        },
        "followers_url": {
          "type": "string"
        },
        "login": {
          "type": "string"
        },
        "gists_url": {
          "type": "string"
        },
        "subscriptions_url": {
          "type": "string"
        },
        "url": {
          "type": "string"
        },
        "organizations_url": {
          "type": "string"
        },
        "events_url": {
          "type": "string"
        },
        "avatar_url": {
          "type": "string"
        },
        "repos_url": {
          "type": "string"
        },
        "node_id": {
          "type": "string"
        },
        "html_url": {
          "type": "string"
        },
        "type": {
          "type": "string"
        },
        "site_admin": {
          "type": "boolean"
        }
      }
    },
    "open_issues": {
      "type": "uint16"
    },
    "collaborators_url": {
      "type": "string"
    },
    "size": {
      "type": "uint32"
    },
    "deployments_url": {
      "type": "string"
    },
    "issues_url": {
      "type": "string"
    },
    "mirror_url": {},
    "description": {
      "type": "string"
    },
    "tags_url": {
      "type": "string"
    },
    "events_url": {
      "type": "string"
    },
    "subscribers_count": {
      "type": "uint16"
    },
    "has_wiki": {
      "type": "boolean"
    },
    "trees_url": {
      "type": "string"
    },
    "language": {
      "type": "string"
    },
    "html_url": {
      "type": "string"
    },
    "url": {
      "type": "string"
    },
    "has_downloads": {
      "type": "boolean"
    },
    "license": {
      "properties": {
        "key": {
          "type": "string"
        },
        "spdx_id": {
          "type": "string"
        },
        "node_id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "url": {
          "type": "string"
        }
      }
    },
    "fork": {
      "type": "boolean"
    },
    "stargazers_count": {
      "type": "uint16"
    },
    "languages_url": {
      "type": "string"
    },
    "has_projects": {
      "type": "boolean"
    },
    "svn_url": {
      "type": "string"
    },
    "statuses_url": {
      "type": "string"
    },
    "comments_url": {
      "type": "string"
    },
    "hooks_url": {
      "type": "string"
    },
    "has_pages": {
      "type": "boolean"
    },
    "forks": {
      "type": "uint16"
    },
    "forks_url": {
      "type": "string"
    },
    "ssh_url": {
      "type": "string"
    },
    "blobs_url": {
      "type": "string"
    },
    "stargazers_url": {
      "type": "string"
    },
    "issue_events_url": {
      "type": "string"
    },
    "node_id": {
      "type": "string"
    },
    "labels_url": {
      "type": "string"
    },
    "contributors_url": {
      "type": "string"
    },
    "updated_at": {
      "type": "timestamp"
    },
    "homepage": {
      "type": "string"
    },
    "organization": {
      "properties": {
        "html_url": {
          "type": "string"
        },
        "login": {
          "type": "string"
        },
        "node_id": {
          "type": "string"
        },
        "gists_url": {
          "type": "string"
        },
        "events_url": {
          "type": "string"
        },
        "organizations_url": {
          "type": "string"
        },
        "received_events_url": {
          "type": "string"
        },
        "type": {
          "type": "string"
        },
        "repos_url": {
          "type": "string"
        },
        "followers_url": {
          "type": "string"
        },
        "following_url": {
          "type": "string"
        },
        "site_admin": {
          "type": "boolean"
        },
        "url": {
          "type": "string"
        },
        "starred_url": {
          "type": "string"
        },
        "gravatar_id": {
          "type": "string"
        },
        "avatar_url": {
          "type": "string"
        },
        "subscriptions_url": {
          "type": "string"
        },
        "id": {
          "type": "uint16"
        }
      }
    },
    "forks_count": {
      "type": "uint16"
    },
    "keys_url": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "default_branch": {
      "type": "string"
    },
    "git_tags_url": {
      "type": "string"
    },
    "has_issues": {
      "type": "boolean"
    },
    "assignees_url": {
      "type": "string"
    },
    "teams_url": {
      "type": "string"
    },
    "full_name": {
      "type": "string"
    },
    "disabled": {
      "type": "boolean"
    },
    "branches_url": {
      "type": "string"
    },
    "git_commits_url": {
      "type": "string"
    },
    "notifications_url": {
      "type": "string"
    },
    "contents_url": {
      "type": "string"
    },
    "subscription_url": {
      "type": "string"
    },
    "archived": {
      "type": "boolean"
    },
    "network_count": {
      "type": "uint16"
    },
    "id": {
      "type": "uint16"
    }
  }
}
```

A bit long-winded, but this is an on-the-nose description of exactly what sort
of data you can expect to get out of this particular endpoint. There's nothing
more to do here!

### Describing `GET /repos/:owner/:repo/events`

This is a much more complex endpoint than the previous one, because it returns
an *activity feed* of data, and activity feeds have many different kinds of
events in them.

To get started, let's get a flavor of the data this endpoint gives us:

```bash
curl https://api.github.com/repos/rails/rails/events
```

The output is too long-winded to paste in full here. You can check out the full
data
[here](https://gist.github.com/ucarion/bb2ffcdb4afe293ea72f9e1b89b7c41d#file-events-json),
but here's just the first element of that output:

```bash
curl https://api.github.com/repos/rails/rails/events | jq '.[0]'
```

```json
{
  "id": "12088582314",
  "type": "IssueCommentEvent",
  "actor": {
    "id": 4244270,
    "login": "jvhaperen",
    "display_login": "jvhaperen",
    "gravatar_id": "",
    "url": "https://api.github.com/users/jvhaperen",
    "avatar_url": "https://avatars.githubusercontent.com/u/4244270?"
  },
  "repo": {
    "id": 8514,
    "name": "rails/rails",
    "url": "https://api.github.com/repos/rails/rails"
  },
  "payload": {
    "action": "created",
    "issue": {
      "url": "https://api.github.com/repos/rails/rails/issues/38918",
      "repository_url": "https://api.github.com/repos/rails/rails",
      "labels_url": "https://api.github.com/repos/rails/rails/issues/38918/labels{/name}",
      "comments_url": "https://api.github.com/repos/rails/rails/issues/38918/comments",
      "events_url": "https://api.github.com/repos/rails/rails/issues/38918/events",
      "html_url": "https://github.com/rails/rails/pull/38918",
      "id": 597833295,
      "node_id": "MDExOlB1bGxSZXF1ZXN0NDAxODY1MjAx",
      "number": 38918,
      "title": "Allow variants to stay in the now supported `WebP` format during processing",
      "user": {
        "login": "jvhaperen",
        "id": 4244270,
        "node_id": "MDQ6VXNlcjQyNDQyNzA=",
        "avatar_url": "https://avatars3.githubusercontent.com/u/4244270?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/jvhaperen",
        "html_url": "https://github.com/jvhaperen",
        "followers_url": "https://api.github.com/users/jvhaperen/followers",
        "following_url": "https://api.github.com/users/jvhaperen/following{/other_user}",
        "gists_url": "https://api.github.com/users/jvhaperen/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/jvhaperen/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/jvhaperen/subscriptions",
        "organizations_url": "https://api.github.com/users/jvhaperen/orgs",
        "repos_url": "https://api.github.com/users/jvhaperen/repos",
        "events_url": "https://api.github.com/users/jvhaperen/events{/privacy}",
        "received_events_url": "https://api.github.com/users/jvhaperen/received_events",
        "type": "User",
        "site_admin": false
      },
      "labels": [
        {
          "id": 664533972,
          "node_id": "MDU6TGFiZWw2NjQ1MzM5NzI=",
          "url": "https://api.github.com/repos/rails/rails/labels/activestorage",
          "name": "activestorage",
          "color": "bfd4f2",
          "default": false,
          "description": null
        }
      ],
      "state": "open",
      "locked": false,
      "assignee": null,
      "assignees": [],
      "milestone": null,
      "comments": 1,
      "created_at": "2020-04-10T11:04:34Z",
      "updated_at": "2020-04-18T19:30:45Z",
      "closed_at": null,
      "author_association": "NONE",
      "pull_request": {
        "url": "https://api.github.com/repos/rails/rails/pulls/38918",
        "html_url": "https://github.com/rails/rails/pull/38918",
        "diff_url": "https://github.com/rails/rails/pull/38918.diff",
        "patch_url": "https://github.com/rails/rails/pull/38918.patch"
      },
      "body": "Allow ActiveStorage Variants to stay in the now supported `WebP` format during processing, instead of being converted to the fallback PNG format. Done by adding `image/webp` to the list of known web image content types for variants.\r\n\r\n### Summary\r\n\r\nWebP support was added by https://github.com/rails/rails/pull/38682 so that WebP images could now be handled by default. But when using a variant of a WebP image it was converted to the fallback PNG format, because the WEB_IMAGE_CONTENT_TYPES in ActiveStorage::Variant and ActiveStorage::VariantWithRecord didn't include `image/webp`\r\n\r\n### Other Information\r\nThe current list of WEB_IMAGE_CONTENT_TYPES (image/png image/jpeg image/jpg image/gif) comes from this commit https://github.com/rails/rails/commit/95117a2ce234c381180429b5b8161fdb44843f30 (@georgeclaghorn committed on 18 Dec 2017). But I couldn't see a reason why image/webp would not be suitable there."
    },
    "comment": {
      "url": "https://api.github.com/repos/rails/rails/issues/comments/615932382",
      "html_url": "https://github.com/rails/rails/pull/38918#issuecomment-615932382",
      "issue_url": "https://api.github.com/repos/rails/rails/issues/38918",
      "id": 615932382,
      "node_id": "MDEyOklzc3VlQ29tbWVudDYxNTkzMjM4Mg==",
      "user": {
        "login": "jvhaperen",
        "id": 4244270,
        "node_id": "MDQ6VXNlcjQyNDQyNzA=",
        "avatar_url": "https://avatars3.githubusercontent.com/u/4244270?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/jvhaperen",
        "html_url": "https://github.com/jvhaperen",
        "followers_url": "https://api.github.com/users/jvhaperen/followers",
        "following_url": "https://api.github.com/users/jvhaperen/following{/other_user}",
        "gists_url": "https://api.github.com/users/jvhaperen/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/jvhaperen/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/jvhaperen/subscriptions",
        "organizations_url": "https://api.github.com/users/jvhaperen/orgs",
        "repos_url": "https://api.github.com/users/jvhaperen/repos",
        "events_url": "https://api.github.com/users/jvhaperen/events{/privacy}",
        "received_events_url": "https://api.github.com/users/jvhaperen/received_events",
        "type": "User",
        "site_admin": false
      },
      "created_at": "2020-04-18T19:30:45Z",
      "updated_at": "2020-04-18T19:30:45Z",
      "author_association": "NONE",
      "body": "Hi George, thanks for your reply.\r\n\r\nI think WebP specifically is a web format but indeed not 100% supported yet. This would however give the web developer the possibility to decide if it is suitable for the target audience of their application. It would also further complement the already merged PR https://github.com/rails/rails/pull/38682 where WebP handling support was added to Rails."
    }
  },
  "public": true,
  "created_at": "2020-04-18T19:30:45Z",
  "org": {
    "id": 4223,
    "login": "rails",
    "gravatar_id": "",
    "url": "https://api.github.com/orgs/rails",
    "avatar_url": "https://avatars.githubusercontent.com/u/4223?"
  }
}
```

From this example, it looks like `type` is telling us what sort of event we're
dealing with. Let's try invoking `jtd-infer`, and telling it that `*.type` is a
special "discriminator" / "type" property:

```bash
curl https://api.github.com/repos/rails/rails/events | jtd-infer --discriminator-hint=/-/type | jq
```

Again, the output is still too large to show. You can see the full output
[here](https://gist.github.com/ucarion/bb2ffcdb4afe293ea72f9e1b89b7c41d#file-infer1-json),
but let's try to look at the sub-schema for `IssueCommentEvent`:

```bash
curl https://api.github.com/repos/rails/rails/events | jtd-infer --discriminator-hint=/-/type | jq .mapping.IssueCommentEvent
```

```json
{
  "properties": {
    "payload": {
      "properties": {
        "action": {
          "type": "string"
        },
        "issue": {
          "properties": {
            "state": {
              "type": "string"
            },
            "title": {
              "type": "string"
            },
            "assignee": {},
            "user": {
              "properties": {
                "login": {
                  "type": "string"
                },
                "site_admin": {
                  "type": "boolean"
                },
                "url": {
                  "type": "string"
                },
                "gists_url": {
                  "type": "string"
                },
                "node_id": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "received_events_url": {
                  "type": "string"
                },
                "repos_url": {
                  "type": "string"
                },
                "avatar_url": {
                  "type": "string"
                },
                "starred_url": {
                  "type": "string"
                },
                "id": {
                  "type": "uint32"
                },
                "gravatar_id": {
                  "type": "string"
                },
                "followers_url": {
                  "type": "string"
                },
                "subscriptions_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                },
                "events_url": {
                  "type": "string"
                },
                "organizations_url": {
                  "type": "string"
                },
                "following_url": {
                  "type": "string"
                }
              }
            },
            "node_id": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "assignees": {
              "elements": {}
            },
            "id": {
              "type": "uint32"
            },
            "html_url": {
              "type": "string"
            },
            "created_at": {
              "type": "timestamp"
            },
            "events_url": {
              "type": "string"
            },
            "locked": {
              "type": "boolean"
            },
            "author_association": {
              "type": "string"
            },
            "labels_url": {
              "type": "string"
            },
            "labels": {
              "elements": {
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "id": {
                    "type": "uint32"
                  },
                  "description": {},
                  "node_id": {
                    "type": "string"
                  },
                  "default": {
                    "type": "boolean"
                  },
                  "color": {
                    "type": "string"
                  },
                  "url": {
                    "type": "string"
                  }
                }
              }
            },
            "comments_url": {
              "type": "string"
            },
            "updated_at": {
              "type": "timestamp"
            },
            "milestone": {},
            "repository_url": {
              "type": "string"
            },
            "closed_at": {
              "nullable": true,
              "type": "timestamp"
            },
            "number": {
              "type": "uint16"
            },
            "comments": {
              "type": "uint8"
            },
            "url": {
              "type": "string"
            }
          },
          "optionalProperties": {
            "pull_request": {
              "properties": {
                "diff_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                },
                "patch_url": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                }
              }
            }
          }
        },
        "comment": {
          "properties": {
            "issue_url": {
              "type": "string"
            },
            "created_at": {
              "type": "timestamp"
            },
            "html_url": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "id": {
              "type": "uint32"
            },
            "url": {
              "type": "string"
            },
            "user": {
              "properties": {
                "site_admin": {
                  "type": "boolean"
                },
                "login": {
                  "type": "string"
                },
                "id": {
                  "type": "uint32"
                },
                "events_url": {
                  "type": "string"
                },
                "node_id": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "repos_url": {
                  "type": "string"
                },
                "starred_url": {
                  "type": "string"
                },
                "followers_url": {
                  "type": "string"
                },
                "gists_url": {
                  "type": "string"
                },
                "avatar_url": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "received_events_url": {
                  "type": "string"
                },
                "following_url": {
                  "type": "string"
                },
                "subscriptions_url": {
                  "type": "string"
                },
                "gravatar_id": {
                  "type": "string"
                },
                "organizations_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                }
              }
            },
            "author_association": {
              "type": "string"
            },
            "node_id": {
              "type": "string"
            },
            "updated_at": {
              "type": "timestamp"
            }
          }
        }
      }
    },
    "repo": {
      "properties": {
        "id": {
          "type": "uint16"
        },
        "url": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      }
    },
    "id": {
      "type": "string"
    },
    "actor": {
      "properties": {
        "url": {
          "type": "string"
        },
        "gravatar_id": {
          "type": "string"
        },
        "avatar_url": {
          "type": "string"
        },
        "id": {
          "type": "uint32"
        },
        "display_login": {
          "type": "string"
        },
        "login": {
          "type": "string"
        }
      }
    },
    "public": {
      "type": "boolean"
    },
    "org": {
      "properties": {
        "gravatar_id": {
          "type": "string"
        },
        "url": {
          "type": "string"
        },
        "id": {
          "type": "uint16"
        },
        "avatar_url": {
          "type": "string"
        },
        "login": {
          "type": "string"
        }
      }
    },
    "created_at": {
      "type": "timestamp"
    }
  }
}
```

Seems pretty good! It seems like there are still some improvements we could
make. `*.payload.action`, `*.payload.issue.author_association`, and
`*.payload.comment.author_association` look like they're probably enums. Let's
try to give that as a hint to `jtd-infer`:

```bash
curl https://api.github.com/repos/rails/rails/events | \
  jtd-infer --discriminator-hint=/-/type \
    --enum-hint=/-/payload/action \
    --enum-hint=/-/payload/issue/author_association \
    --enum-hint=/-/payload/comment/author_association | \
  jq .mapping.IssueCommentEvent
```

The full output is again too large, but you can see it in full
[here](https://gist.github.com/ucarion/bb2ffcdb4afe293ea72f9e1b89b7c41d#file-infer2-json).
But with just the `.mapping.IssueCommentEvent`, we can see that `action` and
`author_association` are now both enums!

```json
{
  "properties": {
    "org": {
      "properties": {
        "url": {
          "type": "string"
        },
        "login": {
          "type": "string"
        },
        "gravatar_id": {
          "type": "string"
        },
        "avatar_url": {
          "type": "string"
        },
        "id": {
          "type": "uint16"
        }
      }
    },
    "repo": {
      "properties": {
        "id": {
          "type": "uint16"
        },
        "url": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      }
    },
    "public": {
      "type": "boolean"
    },
    "payload": {
      "properties": {
        "comment": {
          "properties": {
            "author_association": {
              "enum": [
                "CONTRIBUTOR",
                "NONE"
              ]
            },
            "issue_url": {
              "type": "string"
            },
            "node_id": {
              "type": "string"
            },
            "url": {
              "type": "string"
            },
            "updated_at": {
              "type": "timestamp"
            },
            "html_url": {
              "type": "string"
            },
            "user": {
              "properties": {
                "avatar_url": {
                  "type": "string"
                },
                "id": {
                  "type": "uint32"
                },
                "following_url": {
                  "type": "string"
                },
                "received_events_url": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "login": {
                  "type": "string"
                },
                "followers_url": {
                  "type": "string"
                },
                "gists_url": {
                  "type": "string"
                },
                "site_admin": {
                  "type": "boolean"
                },
                "organizations_url": {
                  "type": "string"
                },
                "repos_url": {
                  "type": "string"
                },
                "events_url": {
                  "type": "string"
                },
                "node_id": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "subscriptions_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                },
                "gravatar_id": {
                  "type": "string"
                },
                "starred_url": {
                  "type": "string"
                }
              }
            },
            "body": {
              "type": "string"
            },
            "id": {
              "type": "uint32"
            },
            "created_at": {
              "type": "timestamp"
            }
          }
        },
        "action": {
          "enum": [
            "created"
          ]
        },
        "issue": {
          "properties": {
            "comments_url": {
              "type": "string"
            },
            "html_url": {
              "type": "string"
            },
            "locked": {
              "type": "boolean"
            },
            "state": {
              "type": "string"
            },
            "user": {
              "properties": {
                "events_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                },
                "login": {
                  "type": "string"
                },
                "repos_url": {
                  "type": "string"
                },
                "gravatar_id": {
                  "type": "string"
                },
                "avatar_url": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "id": {
                  "type": "uint32"
                },
                "starred_url": {
                  "type": "string"
                },
                "gists_url": {
                  "type": "string"
                },
                "following_url": {
                  "type": "string"
                },
                "node_id": {
                  "type": "string"
                },
                "followers_url": {
                  "type": "string"
                },
                "received_events_url": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                },
                "subscriptions_url": {
                  "type": "string"
                },
                "site_admin": {
                  "type": "boolean"
                },
                "organizations_url": {
                  "type": "string"
                }
              }
            },
            "labels": {
              "elements": {
                "properties": {
                  "url": {
                    "type": "string"
                  },
                  "id": {
                    "type": "uint32"
                  },
                  "name": {
                    "type": "string"
                  },
                  "color": {
                    "type": "string"
                  },
                  "description": {},
                  "default": {
                    "type": "boolean"
                  },
                  "node_id": {
                    "type": "string"
                  }
                }
              }
            },
            "author_association": {
              "enum": [
                "NONE",
                "CONTRIBUTOR"
              ]
            },
            "events_url": {
              "type": "string"
            },
            "url": {
              "type": "string"
            },
            "created_at": {
              "type": "timestamp"
            },
            "repository_url": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "assignees": {
              "elements": {}
            },
            "comments": {
              "type": "uint8"
            },
            "milestone": {},
            "closed_at": {
              "nullable": true,
              "type": "timestamp"
            },
            "title": {
              "type": "string"
            },
            "labels_url": {
              "type": "string"
            },
            "id": {
              "type": "uint32"
            },
            "assignee": {},
            "number": {
              "type": "uint16"
            },
            "node_id": {
              "type": "string"
            },
            "updated_at": {
              "type": "timestamp"
            }
          },
          "optionalProperties": {
            "pull_request": {
              "properties": {
                "diff_url": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "patch_url": {
                  "type": "string"
                },
                "html_url": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "actor": {
      "properties": {
        "avatar_url": {
          "type": "string"
        },
        "display_login": {
          "type": "string"
        },
        "gravatar_id": {
          "type": "string"
        },
        "url": {
          "type": "string"
        },
        "login": {
          "type": "string"
        },
        "id": {
          "type": "uint32"
        }
      }
    },
    "created_at": {
      "type": "timestamp"
    },
    "id": {
      "type": "string"
    }
  }
}
```

The enums only cover `created` for issues, and `NONE`/`CONTRIBUTOR` for author
associations. If we tried working over a larger set of test-cases, `jtd-infer`
would probably find more possible enum values. But for now, this is good enough.

It should hopefully now be clear how you can use `jtd-infer` to work with
real-world data. With this in hand, you can now get rid of most of the gruntwork
required to introduce JSON Typedef into an existing system.

[jtd-infer]: https://github.com/jsontypedef/json-typedef-infer
