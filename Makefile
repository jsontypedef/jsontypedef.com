.PHONY: rendered_snippets
rendered_snippets:
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/User.cs > assets/rendered_snippets/User.cs.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.go > assets/rendered_snippets/user.go.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/User.java > assets/rendered_snippets/User.java.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.jtd.json > assets/rendered_snippets/user.jtd.json.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.py > assets/rendered_snippets/user.py.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.rb > assets/rendered_snippets/user.rb.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.rs > assets/rendered_snippets/user.rs.html
	chroma --style=vs --html --html-inline-styles --html-only assets/snippets/user.ts > assets/rendered_snippets/user.ts.html
