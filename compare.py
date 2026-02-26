import os
import filecmp

def get_all_files(dir):
    paths = []
    for root, dirs, files in os.walk(dir):
        for file in files:
            paths.append(os.path.relpath(os.path.join(root, file), dir))
    return paths

old_files = set(get_all_files("oldcode/pdfeditor/src"))
new_files = set(get_all_files("packages/pdfeditor/src"))

diff_files = []
for file in old_files.intersection(new_files):
    if not filecmp.cmp(os.path.join("oldcode/pdfeditor/src", file), os.path.join("packages/pdfeditor/src", file), shallow=False):
        diff_files.append(file)

print("Files that differ:")
for f in diff_files:
    print(f)
