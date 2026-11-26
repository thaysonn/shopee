const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const result = spawnSync("npm audit --json", {
  cwd: join(__dirname, "..", "frontend"),
  encoding: "utf8",
  shell: true,
  maxBuffer: 10 * 1024 * 1024,
});
if (result.error) throw result.error;
if (result.stderr) process.stderr.write(result.stderr);
const report = JSON.parse(result.stdout);
if (
  ![0, 1].includes(result.status) ||
  report.error ||
  !report.metadata?.vulnerabilities
) {
  throw new Error(
    `npm audit failed: ${JSON.stringify(report.error ?? report)}`,
  );
}
console.log(
  "Dependency audit report (lodash is intentional; review additional findings separately):",
);
console.log(JSON.stringify(report.metadata.vulnerabilities, null, 2));
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
  console.log(`${name}: ${entry.severity}, affected ${entry.range}`);
  for (const advisory of entry.via) {
    if (typeof advisory === "object")
      console.log(`  ${advisory.title}: ${advisory.url}`);
  }
}
console.log(
  "Audit completed. Functional CI is not a security approval; review every finding.",
);
