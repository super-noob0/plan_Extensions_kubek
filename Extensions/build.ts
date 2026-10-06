const result = await Bun.build({
  entrypoints: ["frontend/index.ts"],
  outdir: "frontend/dist",
  format: "esm",
  target: "browser",
  external: ["react", "react-dom", "@kubekpanel/extension-sdk"],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("built frontend/dist/index.js");

export {};
