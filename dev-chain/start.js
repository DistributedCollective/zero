const { spawnSync } = require("child_process");
const { join } = require("path");

const nodeConfPath = join(__dirname, "node.conf");

spawnSync("docker", [
  "run",
  "-d",
  "--rm",
  ...["-v", `${nodeConfPath}:/etc/rsk/node.conf`],
  ...["--name", "regtest-node-rsk"],
  ...["-p", "4444:4444/tcp"],
  ...["-p", "30305:30305/tcp"],
  "docker.atixlabs.com/rsk/regtest:fdaf299a72b429d3066860fbc53bbb6e89e0490b"
]);
