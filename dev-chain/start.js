const { spawnSync, execSync } = require("child_process");
const { join } = require("path");

const genesisPath = join(__dirname, "rsk-dev.json");
const nodeConfPath = join(__dirname, "node.conf");

spawnSync("docker", [
  "run",
  "-d",
  "--rm",
  ...["--name", "regtest-node-rsk"],
  ...["-p", "4444:4444/tcp"],
  ...["-p", "30305:30305/tcp"],
  "regtest"
]);
