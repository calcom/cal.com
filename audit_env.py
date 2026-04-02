import json
import subprocess
import os

repo_path = r"C:\Users\hp\Downloads\Calcom"
turbo_json_path = os.path.join(repo_path, "turbo.json")

with open(turbo_json_path, "r") as f:
    turbo_json = json.load(f)

global_env = turbo_json.get("globalEnv", [])
packages = ["apps/web", "apps/api", "packages/lib", "packages/prisma", "packages/ui", "packages/app-store", "packages/features"]

usage_map = {}

# Use a more efficient approach with findstr
# findstr /s /m "VAR" packages\* apps\*
for env_var in global_env:
    usage_map[env_var] = []
    # Narrow down to apps and packages
    search_paths = [os.path.join(repo_path, "apps"), os.path.join(repo_path, "packages")]
    for path in search_paths:
        try:
            # findstr returns 0 if match found, 1 if not
            result = subprocess.run(['findstr', '/s', '/m', '/c:' + env_var, os.path.join(path, "*.*")], capture_output=True, text=True)
            if result.returncode == 0:
                # Need to identify WHICH package
                found_files = result.stdout.splitlines()
                for f_line in found_files:
                    # Extract pkg name from file path
                    rel_to_repo = os.path.relpath(f_line, repo_path)
                    parts = rel_to_repo.split(os.sep)
                    if len(parts) >= 2:
                        pkg_id = f"{parts[0]}/{parts[1]}"
                        if pkg_id not in usage_map[env_var]:
                            usage_map[env_var].append(pkg_id)
        except Exception as e:
            pass

report = {
    "only_web": [],
    "only_api": [],
    "single_pkg": [],
    "not_found": [],
    "multi_pkg": []
}

for env_var, pkgs in usage_map.items():
    if not pkgs:
        report["not_found"].append(env_var)
    elif len(pkgs) == 1:
        report["single_pkg"].append({"var": env_var, "pkg": pkgs[0]})
        if pkgs[0] == "apps/web":
            report["only_web"].append(env_var)
        elif pkgs[0] == "apps/api":
            report["only_api"].append(env_var)
    else:
        report["multi_pkg"].append({"var": env_var, "pkgs": pkgs})

output_report_path = os.path.join(repo_path, "env_usage_report.json")
with open(output_report_path, "w") as f:
    json.dump(report, f, indent=2)

print(f"Audit complete. Results in {output_report_path}")
