const { spawn } = require("child_process");

const isReplit = !!process.env.REPL_ID;
const port = process.env.PORT || "8081";

const env = { ...process.env };
if (isReplit) {
  env.EXPO_PACKAGER_PROXY_URL = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
  env.EXPO_PUBLIC_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
  env.EXPO_PUBLIC_REPL_ID = process.env.REPL_ID;
  env.REACT_NATIVE_PACKAGER_HOSTNAME = process.env.REPLIT_DEV_DOMAIN;
}

const args = ["exec", "expo", "start", "--localhost", "--port", isReplit ? port : "8081"];

console.log(`Starting Expo (isReplit: ${isReplit}, port: ${isReplit ? port : "8081"})...`);

const child = spawn("pnpm", args, {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("close", (code) => {
  process.exit(code || 0);
});
