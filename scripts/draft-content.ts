// Compatibility alias: use the same rights gate and reviewable store as the editorial CLI.
process.argv.splice(2, 0, "generate");
await import("./editorial");

export {};
