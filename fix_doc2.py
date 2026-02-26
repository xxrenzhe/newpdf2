import subprocess

with open("docs/plans/2026-02-26-pdfeditor-e2e-fixes.md", "a") as f:
    f.write("\n### 5. Content-Security-Policy Blocked Navigation Issue\n")
    f.write("- **Issue:** Intermittently, loading the editor or clicking certain elements inside the PDF resulted in the Next.js parent wrapper throwing a \"Editor navigation was blocked and reloaded\" error with a generic \"A link in this PDF tried to open a new page\" toast message.\n")
    f.write("- **Root Cause:** A strict Content-Security-Policy `<meta http-equiv=\"Content-Security-Policy\" content=\"navigate-to 'self'\">` tag existed in `packages/pdfeditor/src/pages/index.html`. This prevented the iframe from handling valid inner navigation loops required for initialization and URL-safe data blob loading. Any violation triggered the parent React `iframe.onLoad` error boundary, reloading the frame endlessly.\n")
    f.write("- **Fix:** Removed the `navigate-to 'self'` CSP directive from the static HTML entrypoint of the PDF Editor to allow it to initialize correctly without self-blocking.\n")

subprocess.run(["git", "add", "docs/plans/2026-02-26-pdfeditor-e2e-fixes.md"])
subprocess.run(["git", "commit", "-m", "docs: document CSP navigation block fix"])
subprocess.run(["git", "push", "origin", "main"])
