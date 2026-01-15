"use client";

type QpdfModule = {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  callMain: (args: string[]) => number;
};

let modulePromise: Promise<QpdfModule> | null = null;

async function getQpdfModule(): Promise<QpdfModule> {
  if (!modulePromise) {
    const qpdfJsUrl = "/wasm/qpdf.js";
    modulePromise = import(/* webpackIgnore: true */ qpdfJsUrl).then(async (mod) => {
      const init = mod.default as (opts?: {
        locateFile?: (path: string) => string;
        instantiateWasm?: (
          imports: WebAssembly.Imports,
          successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
        ) => unknown;
      }) => Promise<QpdfModule>;
      return init({
        locateFile: (p) => {
          if (p === "qpdf.js") return "/wasm/qpdf.js";
          if (p === "qpdf.wasm") return "/wasm/qpdf.wasm";
          return p;
        },
        instantiateWasm: (imports: WebAssembly.Imports, successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void) => {
          const wasmUrl = "/wasm/qpdf.wasm";
          return fetch(wasmUrl, { credentials: "same-origin" })
            .then((res) => {
              if (!res.ok) throw new Error(`Failed to load ${wasmUrl} (${res.status})`);
              return res.arrayBuffer();
            })
            .then((bytes) => WebAssembly.instantiate(bytes, imports))
            .then(({ instance, module }) => {
              successCallback(instance, module);
              return instance;
            });
        },
      });
    });
  }
  return modulePromise;
}

function uniqueName(prefix: string, suffix: string) {
  const id = crypto.randomUUID().replaceAll("-", "");
  return `${prefix}-${id}${suffix}`;
}

async function runQpdf(args: string[], files: Record<string, Uint8Array>, outputFile: string) {
  const qpdf = await getQpdfModule();
  const created: string[] = [];
  try {
    for (const [name, data] of Object.entries(files)) {
      qpdf.FS.writeFile(name, data);
      created.push(name);
    }

    try {
      const exitCode = qpdf.callMain(args);
      if (exitCode !== 0) {
        throw new Error(`qpdf failed (exit code ${exitCode})`);
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error("qpdf failed");
    }

    const out = qpdf.FS.readFile(outputFile);
    return out;
  } finally {
    for (const name of [...Object.keys(files), outputFile, ...created]) {
      try {
        qpdf.FS.unlink(name);
      } catch {
        // ignore
      }
    }
  }
}

export async function encryptPdfBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!password) throw new Error("Password is required");
  const input = uniqueName("in", ".pdf");
  const output = uniqueName("out", ".pdf");

  // qpdf syntax: qpdf --encrypt user owner keylen -- input output
  const args = ["--encrypt", password, password, "256", "--", input, output];
  return runQpdf(args, { [input]: bytes }, output);
}

export async function decryptPdfBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const input = uniqueName("in", ".pdf");
  const output = uniqueName("out", ".pdf");

  // qpdf syntax: qpdf --password=xxx --decrypt input output
  const args = [`--password=${password ?? ""}`, "--decrypt", "--", input, output];
  return runQpdf(args, { [input]: bytes }, output);
}
