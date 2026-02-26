import subprocess

subprocess.run(["git", "add", "src/components/SecurityInitializer.tsx"])
subprocess.run(["git", "commit", "-m", "fix: prevent 403 error on legacy pdf editor iframe by bypassing iframe embed check"])
subprocess.run(["git", "push", "origin", "main"])
