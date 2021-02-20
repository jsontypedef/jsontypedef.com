# jsontypedef.com

This repo contains the code that backs [the JSON Typedef
website](https://jsontypedef.com). The website uses [Hugo](https://gohugo.io/).
Once you've [installed
Hugo](https://gohugo.io/getting-started/quick-start/#step-1-install-hugo), you
can build and serve the site locally with:

```bash
hugo server
```

If you want to regenerate the rendered snippets on the index page, run:

```bash
go get -u github.com/alecthomas/chroma/cmd/chroma
make rendered_snippets
```
