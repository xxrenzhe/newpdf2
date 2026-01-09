declare module "qpdf-wasm" {
  type QpdfModule = {
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      unlink: (path: string) => void;
    };
    callMain: (args: string[]) => number;
  };

  export default function init(opts?: { locateFile?: (path: string) => string }): Promise<QpdfModule>;
}

