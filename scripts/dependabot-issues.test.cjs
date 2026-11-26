const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const workflow = readFileSync(
  join(__dirname, "..", ".github", "workflows", "dependabot-issues.yml"),
  "utf8",
).replace(/\r\n/g, "\n");
const scriptBlock = workflow.split("          script: |\n");
assert.equal(
  scriptBlock.length,
  2,
  "Expected a single inline script at the end of the workflow",
);
const script = scriptBlock[1]
  .split("\n")
  .map((line) => line.replace(/^ {12}/, ""))
  .join("\n");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const execute = new AsyncFunction("github", "context", script);

function fixture() {
  const pr = {
    user: { login: "dependabot[bot]", type: "Bot" },
    head: { repo: { full_name: "demo/shop" } },
    base: { ref: "main" },
    state: "open",
    merged: false,
  };
  const issues = [];
  const calls = { create: 0, update: 0, paginate: 0 };
  const listForRepo = () => {
    throw new Error("Use pagination");
  };
  const github = {
    rest: {
      pulls: {
        get: async (args) => {
          assert.equal(args.pull_number, 42);
          return { data: pr };
        },
      },
      issues: {
        listForRepo,
        create: async (args) => {
          calls.create++;
          const issue = {
            ...args,
            number: issues.length + 1,
            state: "open",
            user: { login: "github-actions[bot]" },
          };
          issues.push(issue);
          return { data: issue };
        },
        update: async (args) => {
          calls.update++;
          const issue = issues.find(
            (item) => item.number === args.issue_number,
          );
          assert.ok(issue);
          Object.assign(issue, args);
          return { data: issue };
        },
      },
    },
    paginate: async (method, args) => {
      calls.paginate++;
      assert.equal(method, listForRepo);
      assert.equal(args.state, "all");
      assert.equal(args.per_page, 100);
      assert.equal(args.creator, "github-actions[bot]");
      return issues;
    },
  };
  const context = {
    repo: { owner: "demo", repo: "shop" },
    serverUrl: "https://github.com",
    payload: {
      pull_request: { number: 42 },
      repository: { default_branch: "main" },
    },
  };
  return { pr, issues, calls, run: () => execute(github, context) };
}

test("workflow is metadata-only with least privilege and serial execution", () => {
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /types: \[opened, reopened, closed\]/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /pull-requests: read/);
  assert.doesNotMatch(
    workflow,
    /actions\/checkout|contents: write|secrets\.|^\s+run:/m,
  );
  assert.match(workflow, /actions\/github-script@[a-f0-9]{40}/);
});

test("creates a linked issue and repeated events do not duplicate it", async () => {
  const f = fixture();
  await f.run();
  await f.run();
  assert.equal(f.calls.create, 1);
  assert.equal(f.calls.update, 0);
  assert.match(f.issues[0].body, /https:\/\/github.com\/demo\/shop\/pull\/42/);
});

test("merge closes the issue and delayed events remain idempotent", async () => {
  const f = fixture();
  await f.run();
  f.pr.merged = true;
  f.pr.state = "closed";
  await f.run();
  await f.run();
  assert.equal(f.issues[0].state, "closed");
  assert.equal(f.issues[0].state_reason, "completed");
  assert.equal(f.calls.create, 1);
  assert.equal(f.calls.update, 1);
});

test("closing without merge keeps issue open, reopening updates status", async () => {
  const f = fixture();
  await f.run();
  f.pr.state = "closed";
  await f.run();
  assert.equal(f.issues[0].state, "open");
  assert.match(f.issues[0].body, /sem merge/);
  f.issues[0].state = "closed";
  f.pr.state = "open";
  await f.run();
  assert.equal(f.issues[0].state, "open");
  assert.match(f.issues[0].body, /PR aberto/);
});

test("can reconcile a merged PR when its initial event was missed", async () => {
  const f = fixture();
  f.pr.merged = true;
  f.pr.state = "closed";
  await f.run();
  assert.equal(f.calls.create, 1);
  assert.equal(f.issues[0].state, "closed");
});

for (const [name, mutate] of [
  [
    "other authors",
    (pr) => {
      pr.user.login = "someone";
    },
  ],
  [
    "non-bot identity",
    (pr) => {
      pr.user.type = "User";
    },
  ],
  [
    "fork PRs",
    (pr) => {
      pr.head.repo.full_name = "other/shop";
    },
  ],
  [
    "deleted forks",
    (pr) => {
      pr.head.repo = null;
    },
  ],
  [
    "non-default base",
    (pr) => {
      pr.base.ref = "feature";
    },
  ],
]) {
  test(`ignores ${name}`, async () => {
    const f = fixture();
    mutate(f.pr);
    await f.run();
    assert.equal(f.calls.create, 0);
    assert.equal(f.calls.paginate, 0);
  });
}

test("does not mistake another PR or user-authored marker for its issue", async () => {
  const f = fixture();
  f.issues.push(
    {
      number: 1,
      body: "<!-- dependabot-pr:420 -->\n",
      user: { login: "github-actions[bot]" },
    },
    {
      number: 2,
      body: "<!-- dependabot-pr:42 -->\n",
      user: { login: "someone" },
    },
    {
      number: 3,
      body: "<!-- dependabot-pr:42 -->\n",
      user: { login: "github-actions[bot]" },
      pull_request: {},
    },
  );
  await f.run();
  assert.equal(f.calls.create, 1);
  assert.equal(f.calls.update, 0);
});

test("finds an existing issue beyond a hundred entries", async () => {
  const f = fixture();
  for (let i = 1; i <= 150; i++) {
    f.issues.push({
      number: i,
      body: "unrelated",
      user: { login: "github-actions[bot]" },
    });
  }
  await f.run();
  await f.run();
  assert.equal(f.issues.length, 151);
  assert.equal(f.calls.create, 1);
});

test("API failures propagate rather than reporting success", async () => {
  const context = {
    repo: { owner: "demo", repo: "shop" },
    payload: { pull_request: { number: 42 } },
  };
  const github = {
    rest: {
      pulls: {
        get: async () => {
          throw new Error("API unavailable");
        },
      },
    },
  };
  await assert.rejects(execute(github, context), /API unavailable/);
});
