declare module 'solc' {
  interface ImportObject {
    contents?: string;
    error?: string;
  }
  interface ImportCallback {
    (path: string): ImportObject;
  }
  interface CompileOptions {
    import?: ImportCallback;
  }
  export function compile(input: string, options?: CompileOptions): string;
  export default {
    compile,
  };
}
