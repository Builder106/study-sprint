const warn = console.warn.bind(console);

console.warn = (...args: Parameters<typeof console.warn>) => {
  warn(...args);
  throw new Error(`Unexpected console.warn: ${args.map(String).join(' ')}`);
};
