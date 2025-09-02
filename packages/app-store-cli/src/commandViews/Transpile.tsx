import { execSync } from "child_process";
import fs from "fs";
import { Text, Box } from "ink";
import path from "path";
import React, { useState, useEffect } from "react";

import { Message } from "../components/Message";

interface TranspileProps {
  slug?: string;
}

export default function Transpile({ slug }: TranspileProps) {
  const [status, setStatus] = useState<"running" | "success" | "error">("running");
  const [message, setMessage] = useState("Starting transpilation...");
  const [details, setDetails] = useState<string[]>([]);

  const findTSFiles = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist") {
        files.push(...findTSFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }

    return files;
  };

  useEffect(() => {
    const transpileApps = async () => {
      try {
        const appStorePath = path.resolve(__dirname, "../../../app-store");

        if (!fs.existsSync(appStorePath)) {
          throw new Error(`App store directory not found at ${appStorePath}`);
        }

        const apps = fs
          .readdirSync(appStorePath, { withFileTypes: true })
          .filter(
            (dirent) => dirent.isDirectory() && !dirent.name.startsWith(".") && dirent.name !== "node_modules"
          )
          .map((dirent) => dirent.name);

        const appsToTranspile = slug ? apps.filter((app) => app === slug) : apps;

        if (slug && appsToTranspile.length === 0) {
          throw new Error(`App with slug "${slug}" not found`);
        }

        setMessage(`Found ${appsToTranspile.length} app(s) to transpile`);
        const transpileDetails: string[] = [];

        const rootTsConfigPath = path.resolve(__dirname, "../../../../tsconfig.json");

        for (const appName of appsToTranspile) {
          const appPath = path.join(appStorePath, appName);
          const distPath = path.join(appPath, "dist");

          if (!fs.existsSync(distPath)) {
            fs.mkdirSync(distPath, { recursive: true });
          }

          const tsFiles = findTSFiles(appPath);

          if (tsFiles.length === 0) {
            transpileDetails.push(`${appName}: No TypeScript files found`);
            continue;
          }

          try {
            const tempTsConfig = {
              extends: rootTsConfigPath,
              compilerOptions: {
                outDir: distPath,
                rootDir: appPath,
                target: "es2020",
                module: "commonjs",
                declaration: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                skipLibCheck: true,
                moduleResolution: "node",
                resolveJsonModule: true,
                isolatedModules: false,
              },
              include: [path.join(appPath, "**/*.ts"), path.join(appPath, "**/*.tsx")],
              exclude: [
                path.join(appPath, "node_modules"),
                path.join(appPath, "dist"),
                path.join(appPath, "**/*.test.ts"),
                path.join(appPath, "**/*.test.tsx"),
                path.join(appPath, "**/*.spec.ts"),
                path.join(appPath, "**/*.spec.tsx"),
              ],
            };

            const tempConfigPath = path.join(appPath, "tsconfig.temp.json");
            fs.writeFileSync(tempConfigPath, JSON.stringify(tempTsConfig, null, 2));

            const tscCommand = `npx tsc --project "${tempConfigPath}"`;
            execSync(tscCommand, {
              cwd: path.resolve(__dirname, "../../../.."), // Run from repo root
              stdio: "pipe",
            });

            fs.unlinkSync(tempConfigPath);

            transpileDetails.push(`${appName}: Successfully transpiled ${tsFiles.length} files`);
          } catch (error) {
            transpileDetails.push(
              `${appName}: Failed to transpile - ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        setDetails(transpileDetails);
        setMessage(`Transpilation completed for ${appsToTranspile.length} app(s)`);
        setStatus("success");
      } catch (error) {
        setMessage(`Transpilation failed: ${error instanceof Error ? error.message : String(error)}`);
        setStatus("error");
      }
    };

    transpileApps();
  }, [slug, findTSFiles]);

  return (
    <Box flexDirection="column">
      <Message
        type={status === "error" ? "error" : status === "success" ? "success" : "info"}
        message={message}
      />

      {details.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Transpilation Details:</Text>
          {details.map((detail, index) => (
            <Text key={index}> • {detail}</Text>
          ))}
        </Box>
      )}

      {status === "success" && (
        <Box marginTop={1}>
          <Text color="green">
            ✓ Transpilation complete! Run &apos;yarn app-store:build&apos; to regenerate imports with JS
            fallback.
          </Text>
        </Box>
      )}
    </Box>
  );
}
