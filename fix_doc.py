import subprocess

with open("docs/plans/2026-02-26-pdfeditor-e2e-fixes.md", "a") as f:
    f.write("\n### 4. 403 Forbidden Access on Editor Iframe Load\n")
    f.write("- **Issue:** The editor iframe failed to load entirely on the homepage resulting in a `403 Access Forbidden` page inside the iframe area.\n")
    f.write("- **Root Cause:** A newly added security initialization logic (`src/components/SecurityInitializer.tsx`) applied `preventIframeEmbedding()` which rigorously checks `window.self !== window.top` across all routes. Since the legacy editor runs within an iframe `src=/pdfeditor/index.html`, this triggered the security anti-scraping block and forced a 403 redirect.\n")
    f.write("- **Fix:** Updated `SecurityInitializer.tsx` to explicitly whitelist iframe embed protection if the pathname matches `/pdfeditor/*` or if running in E2E environments, restoring successful PDF loading.\n")

subprocess.run(["git", "add", "docs/plans/2026-02-26-pdfeditor-e2e-fixes.md"])
subprocess.run(["git", "commit", "-m", "docs: document 403 forbidden iframe fix"])
subprocess.run(["git", "push", "origin", "main"])
