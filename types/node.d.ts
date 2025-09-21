declare module 'node:test' {
  type TestFn = (t: unknown) => void | Promise<void>;
  const test: (name: string, fn: TestFn) => void;
  export default test;
}

declare module 'node:assert/strict' {
  const assert: typeof import('assert');
  export default assert;
}
