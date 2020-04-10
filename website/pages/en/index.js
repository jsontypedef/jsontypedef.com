/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require("react");

const CompLibrary = require("../../core/CompLibrary.js");
const PageSection = require(`${process.cwd()}/core/PageSection.js`);

const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const mainExample1 = `
\`\`\`js
// This example uses the JavaScript implementation
// of JSON Typedef.
const jtd = require("jtd");

const schema = {
  "properties": {
    "name": { "type": "string" },
    "created_at": { "type": "timestamp" },
    "favorite_numbers": {
      "elements": { "type": "float64" }
    }
  }
}
\`\`\`
`;

const mainExample2 = `
\`\`\`js
// Returns an empty array -- no errors!
jtd.validate(schema, {
  id: "foo",
  created_at: "2020-04-10T20:25:43Z",
  favorite_numbers: [1, 3.14, 42]
})
\`\`\`
`;

const mainExample3 = `
\`\`\`js
// Returns three errors:
//
// 1. error at: (root of input)
//    (due to: "/properties/id")
//
// 2. error at: "/created_at"
//    (due to: "/properties/created_at/type")
//
// 3. error at: "/favorite_numbers/1"
//    (due to: "/properties/favorite_numbers/elements/type")
jtd.validate(schema, {
  created_at: "yesterday",
  favorite_numbers: [1, "3.14", 42]
})
\`\`\`
`;

const mainExample4 = `
\`\`\`json
// user.jtd.json

{
  "properties": {
    "name": { "type": "string" },
    "created_at": { "type": "timestamp" },
    "favorite_numbers": {
      "elements": { "type": "float64" }
    }
  }
}
\`\`\`
`;

const mainExample5 = `
\`\`\`go
package user

import "time"

// This is the sort of Go code that jtd-codegen
// would generate from the schema on the left.
type User struct {
  Name            string    \`json:"name"\`
  CreatedAt       time.Time \`json:"created_at"\`
  FavoriteNumbers []float64 \`json:"favorite_numbers"\`
}
\`\`\`
`;

class HomeSplash extends React.Component {
  render() {
    const { siteConfig, language = "" } = this.props;
    const { baseUrl, docsUrl } = siteConfig;
    const docsPart = `${docsUrl ? `${docsUrl}/` : ""}`;
    const langPart = `${language ? `${language}/` : ""}`;
    const docUrl = (doc) => `${baseUrl}${docsPart}${langPart}${doc}`;
    const SplashContainer = (props) => (
      <div className="homeContainer">
        <div className="homeSplashFade">
          <div className="wrapper homeWrapper">{props.children}</div>
        </div>
      </div>
    );
    const Logo = (props) => (
      <div className="projectLogo">
        <img src={props.img_src} alt="Project Logo" />
      </div>
    );
    const ProjectTitle = (props) => (
      <h2 className="projectTitle">
        {props.title}
        <small>{props.tagline}</small>
      </h2>
    );
    const PromoSection = (props) => (
      <div className="section promoSection">
        <div className="promoRow">
          <div className="pluginRowBlock">{props.children}</div>
        </div>
      </div>
    );
    const Button = (props) => (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={props.href} target={props.target}>
          {props.children}
        </a>
      </div>
    );
    return (
      <>
        <SplashContainer>
          <Logo img_src={`${baseUrl}img/jtd-logo-white.png`} />
          <div className="inner">
            <ProjectTitle
              title="JSON Typedef is a JSON schema language designed for code generation"
              tagline="Describe the shape of your data once. Automatically generate validators and types for any language."
            />
            <PromoSection>
              <Button href="/docs">Get Started</Button>
              <Button href="https://try.jsontypedef.com">Try it online</Button>
            </PromoSection>
          </div>
        </SplashContainer>
        <Container align="center" className="featuresContainer">
          <GridBlock
            align="center"
            layout="threeColumn"
            contents={[
              {
                title: "Easy to learn",
                content:
                  "If you've used JSON before, and you've used a type system before, you can learn all of JSON Typedef in just a few minutes.\n\n[Get started with JSON Typedef →](/docs)",
              },
              {
                title: "Type system / IDE integration",
                content:
                  "Generate TypeScript interfaces, Golang structs, Java classes, and much more from your schemas using the `jtd-codegen` tool.\n\n[Learn more about `jtd-codegen` →](/docs/tools/jtd-codegen)",
              },
              {
                title: "Cross-platform consistency",
                content:
                  " Run input validation anywhere, get conistent results. Every implementation produces the exact same validation errors.\n\n[Browse implementations →](/docs/implementations)",
              },
            ]}
          />
        </Container>
        <div class="wrapper">
          <PageSection>
            <h2>Easy to write, easy to read</h2>
            <div className="row">
              <div className="column">
                <p>
                  JSON Typedef schemas are written in JSON, in a syntax that's
                  designed to be familiar and unsurprising.
                </p>
                <p>
                  Because schemas are written in JSON, it's easy to parse them
                  yourself for your own custom tooling. You can also easily
                  generate JSON Typedef schemas from other data formats.
                </p>
                <p></p>
              </div>
              <div className="column">
                <MarkdownBlock>{mainExample1}</MarkdownBlock>
              </div>
            </div>
          </PageSection>
        </div>
        <PageSection gray>
          <div class="wrapper">
            <h2>Easy to use</h2>
            <div className="row">
              <div className="column">
                <p>
                  The example on the right shows how you can use the JavaScript
                  implementation of JSON Typedef. Checking if data is valid is
                  as easy as <code>jtd.validate(schemaJSON, inputJSON)</code>.
                </p>
                <p>
                  <a href="/docs">Check out the docs</a> to see how easy
                  validation is in your preferred programming language.
                </p>
              </div>
              <div className="column">
                <MarkdownBlock>{mainExample2}</MarkdownBlock>
              </div>
            </div>
          </div>
        </PageSection>
        <div class="wrapper">
          <PageSection>
            <h2>Portable and specific errors</h2>
            <div className="row">
              <div className="column">
                <p>
                  No more useless <code>error: invalid input</code> validation
                  messages. In JSON Typedef, validation errors are part of the
                  spec, and every implementation, across every language, returns
                  the same errors.
                </p>
                <p>
                  Give your users specific errors, without lock-in. With JSON
                  Typedef, you can change what language you do your validation
                  in without changing the validation errors you give your
                  customers.
                </p>
              </div>
              <div className="column">
                <MarkdownBlock>{mainExample3}</MarkdownBlock>
              </div>
            </div>
          </PageSection>
        </div>
        <PageSection gray>
          <div class="wrapper">
            <h2>Powerful code generation</h2>
            <div className="row">
              <div className="column">
                <p>
                  You can generate code in almost any modern programming
                  language from any JSON Typedef schema.
                </p>

                <p>
                  Once you install{" "}
                  <a href="/docs/tools/jtd-codegen">
                    <code>jtd-codegen</code>
                  </a>
                  , generating code from a schema is as easy as:{" "}
                  <code>jtd-codegen --go-out=user/ -- user.jtd.json</code>.
                </p>
              </div>
              <div className="column">
                <a href="/docs/tools/jtd-codegen">
                  <code>jtd-codegen</code>
                </a>
                supports many languages, not just Golang. You can generate code
                in TypeScript, Java, or Rust, with more languages on the way!
              </div>
            </div>
            <div class="row">
              <div class="column">
                <MarkdownBlock>{mainExample4}</MarkdownBlock>
              </div>
              <div class="column">
                <MarkdownBlock>{mainExample5}</MarkdownBlock>
              </div>
            </div>
          </div>
        </PageSection>
        <Container align="center" className="featuresContainer">
          <h2>
            <p>Dive into the docs</p>
          </h2>
          <GridBlock
            align="center"
            layout="threeColumn"
            contents={[
              {
                title: "Learn JSON Typedef",
                content:
                  "JSON Typedef is designed to be obvious and instantly familiar. See how easy it is to pick up, and then learn how to use JTD in your existing code.\n\n[Introduction to JSON Typedef →](/docs/intro)",
              },
              {
                title: "Infer a schema from real data",
                content:
                  "The `jtd-infer` tool lets you infer a schema from real data, so you can get introduce JSON Typedef into existing systems in no time.\n\n[Learn more about `jtd-infer` →](/docs/tools/jtd-infer)",
              },
              {
                title: "Create fake data off a schema",
                content:
                  "With `jtd-fuzz`, you can generate synthetic data from a JSON Typedef schema. Learn how you can use this to uncover bugs and do load testing.\n\n[Learn more about `jtd-fuzz` →](/docs/tools/jtd-fuzz)",
              },
            ]}
          />
        </Container>
      </>
    );
  }
}

class Index extends React.Component {
  render() {
    const { config: siteConfig, language = "" } = this.props;
    const { baseUrl } = siteConfig;

    const Block = (props) => (
      <Container
        padding={["bottom", "top"]}
        id={props.id}
        background={props.background}
      >
        <GridBlock
          align="center"
          contents={props.children}
          layout={props.layout}
        />
      </Container>
    );

    const FeatureCallout = () => (
      <div
        className="productShowcaseSection paddingBottom"
        style={{ textAlign: "center" }}
      >
        <h2>Feature Callout</h2>
        <MarkdownBlock>These are features of this project</MarkdownBlock>
      </div>
    );

    const TryOut = () => (
      <Block id="try">
        {[
          {
            content:
              "To make your landing page more attractive, use illustrations! Check out " +
              "[**unDraw**](https://undraw.co/) which provides you with customizable illustrations which are free to use. " +
              "The illustrations you see on this page are from unDraw.",
            image: `${baseUrl}img/undraw_code_review.svg`,
            imageAlign: "left",
            title: "Wonderful SVG Illustrations",
          },
        ]}
      </Block>
    );

    const Description = () => (
      <Block background="dark">
        {[
          {
            content:
              "This is another description of how this project is useful",
            image: `${baseUrl}img/undraw_note_list.svg`,
            imageAlign: "right",
            title: "Description",
          },
        ]}
      </Block>
    );

    const LearnHow = () => (
      <Block background="light">
        {[
          {
            content:
              "Each new Docusaurus project has **randomly-generated** theme colors.",
            image: `${baseUrl}img/undraw_youtube_tutorial.svg`,
            imageAlign: "right",
            title: "Randomly Generated Theme Colors",
          },
        ]}
      </Block>
    );

    const Features = () => (
      <Block layout="fourColumn">
        {[
          {
            content: "This is the content of my feature",
            image: `${baseUrl}img/undraw_react.svg`,
            imageAlign: "top",
            title: "Feature One",
          },
          {
            content: "The content of my second feature",
            image: `${baseUrl}img/undraw_operating_system.svg`,
            imageAlign: "top",
            title: "Feature Two",
          },
        ]}
      </Block>
    );

    const Showcase = () => {
      if ((siteConfig.users || []).length === 0) {
        return null;
      }

      const showcase = siteConfig.users
        .filter((user) => user.pinned)
        .map((user) => (
          <a href={user.infoLink} key={user.infoLink}>
            <img src={user.image} alt={user.caption} title={user.caption} />
          </a>
        ));

      const pageUrl = (page) =>
        baseUrl + (language ? `${language}/` : "") + page;

      return (
        <div className="productShowcaseSection paddingBottom">
          <h2>Who is Using This?</h2>
          <p>This project is used by all these people</p>
          <div className="logos">{showcase}</div>
          <div className="more-users">
            <a className="button" href={pageUrl("users.html")}>
              More {siteConfig.title} Users
            </a>
          </div>
        </div>
      );
    };

    return (
      <div>
        <HomeSplash siteConfig={siteConfig} language={language} />
        {/* <div className="mainContainer">
          <Features />
          <FeatureCallout />
          <LearnHow />
          <TryOut />
          <Description />
          <Showcase />
        </div> */}
      </div>
    );
  }
}

module.exports = Index;
