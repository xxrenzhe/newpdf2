import { expect, test as base, type ConsoleMessage, type Page } from "playwright/test";

type ConsoleEntry = {
  type: string;
  text: string;
  location?: string;
};

type PageErrorEntry = {
  message: string;
  stack?: string;
};

const IGNORED_CONSOLE_ERRORS = [
  /Unrecognized Content-Security-Policy directive 'navigate-to'/,
];

function shouldIgnoreConsoleError(msg: ConsoleMessage) {
  const text = msg.text();
  return IGNORED_CONSOLE_ERRORS.some((pattern) => pattern.test(text));
}

function formatConsoleMessage(msg: ConsoleMessage): ConsoleEntry {
  const loc = msg.location();
  const location = loc.url ? `${loc.url}:${loc.lineNumber ?? 0}:${loc.columnNumber ?? 0}` : undefined;
  return { type: msg.type(), text: msg.text(), location };
}

function attachConsoleAndPageErrorListeners(
  page: Page,
  consoleErrors: ConsoleEntry[],
  pageErrors: PageErrorEntry[]
) {
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    if (shouldIgnoreConsoleError(msg)) return;
    consoleErrors.push(formatConsoleMessage(msg));
  };
  const onPageError = (err: Error) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  };
}

export const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    const consoleErrors: ConsoleEntry[] = [];
    const pageErrors: PageErrorEntry[] = [];
    const detachFns = new WeakMap<Page, () => void>();

    const attach = (page: Page) => {
      if (detachFns.has(page)) return;
      detachFns.set(page, attachConsoleAndPageErrorListeners(page, consoleErrors, pageErrors));
    };

    for (const page of context.pages()) attach(page);
    context.on("page", attach);

    try {
      await use(context);
    } finally {
      context.off("page", attach);
      for (const page of context.pages()) detachFns.get(page)?.();
    }

    if (consoleErrors.length > 0) {
      await testInfo.attach("console-errors", {
        body: consoleErrors
          .map((e) => `[console.${e.type}] ${e.location ? `${e.location} ` : ""}${e.text}`)
          .join("\n"),
        contentType: "text/plain",
      });
    }

    if (pageErrors.length > 0) {
      await testInfo.attach("page-errors", {
        body: pageErrors.map((e) => `${e.message}\n${e.stack ?? ""}`.trim()).join("\n\n"),
        contentType: "text/plain",
      });
    }

    if (testInfo.status === testInfo.expectedStatus && (consoleErrors.length > 0 || pageErrors.length > 0)) {
      const summary = [
        consoleErrors.length ? `console errors: ${consoleErrors.length}` : null,
        pageErrors.length ? `page errors: ${pageErrors.length}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      throw new Error(`Console/page errors detected (${summary}). See attachments for details.`);
    }
  },
});

export { expect };
