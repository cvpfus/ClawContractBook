declare module 'solc' {
  interface ImportObject {
    contents?: string;
    error?: string;
  }
  interface ImportCallback {
    (path: string): ImportObject;
  }
  export function compile(input: string, importCallback?: ImportCallback): string;
  export default {
    compile,
  };
}
