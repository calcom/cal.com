// vite.config.ts
import react from "file:///Users/tombauer/workspace/github.com/TBau23/gauntlet/cal.com/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { resolve } from "path";
import { defineConfig, loadEnv } from "file:///Users/tombauer/workspace/github.com/TBau23/gauntlet/cal.com/node_modules/vite/dist/node/index.js";
import dts from "file:///Users/tombauer/workspace/github.com/TBau23/gauntlet/cal.com/packages/platform/atoms/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/tombauer/workspace/github.com/TBau23/gauntlet/cal.com/packages/platform/atoms";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const webAppUrl = env.NEXT_PUBLIC_WEBAPP_URL ?? "https://app.cal.com";
  const calcomVersion = env.NEXT_PUBLIC_CALCOM_VERSION ?? "";
  const vercelCommitSha = env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "";
  return {
    optimizeDeps: {
      include: [
        "@calcom/lib",
        "@calcom/features",
        "@calcom/prisma",
        "@calcom/dayjs",
        "@calcom/platform-constants",
        "@calcom/platform-types",
        "@calcom/platform-utils"
      ]
    },
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
        beforeWriteFile: (filePath, content) => {
          if (content.includes(`kysely/types.ts').$Enums`)) {
            return {
              filePath,
              content: content.replaceAll(`kysely/types.ts').$Enums`, `kysely/types.ts')`)
            };
          }
          return { filePath, content };
        }
      })
    ],
    define: {
      "process.env.NEXT_PUBLIC_WEBAPP_URL": `"${webAppUrl}"`,
      "process.env.NEXT_PUBLIC_CALCOM_VERSION": `"${calcomVersion}"`,
      "process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA": `"${vercelCommitSha}"`,
      "process.env.NODE_ENV": `"${mode}"`,
      "process.env.__NEXT_ROUTER_BASEPATH": `""`,
      "process.env.__NEXT_I18N_SUPPORT": `false`,
      "process.env.__NEXT_MANUAL_TRAILING_SLASH": `false`,
      "process.env.__NEXT_TRAILING_SLASH": `false`,
      "process.env": "{}"
    },
    ssr: {
      noExternal: ["turndown"]
      // Example if you want to disable SSR for your library
    },
    build: {
      lib: {
        entry: [resolve(__vite_injected_original_dirname, "index.ts")],
        name: "CalAtoms",
        fileName: "cal-atoms"
      },
      rollupOptions: {
        external: [
          "react",
          "fs",
          "path",
          "os",
          "react/jsx-runtime",
          "react-dom",
          "react-dom/client",
          "@prisma/client",
          "react/jsx-dev-runtime",
          ,
          "react-awesome-query-builder",
          "react-awesome-query-builder",
          "react-awesome-query-builder"
        ],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            "react/jsx-runtime": "ReactJsxRuntime"
          }
        }
      }
    },
    resolve: {
      alias: {
        fs: resolve("../../../node_modules/rollup-plugin-node-builtins"),
        path: resolve("../../../node_modules/rollup-plugin-node-builtins"),
        os: resolve("../../../node_modules/rollup-plugin-node-builtins"),
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "@calcom/lib/markdownToSafeHTML": path.resolve(__vite_injected_original_dirname, "./lib/markdownToSafeHTML"),
        "@calcom/lib/hooks/useLocale": path.resolve(__vite_injected_original_dirname, "./lib/useLocale"),
        "@radix-ui/react-tooltip": path.resolve(__vite_injected_original_dirname, "./src/components/ui/tooltip.tsx"),
        "@radix-ui/react-dialog": path.resolve(__vite_injected_original_dirname, "./src/components/ui/dialog.tsx"),
        "@calcom/prisma/client/runtime/library": resolve("./prisma-types/index.ts"),
        "@calcom/prisma/client": path.resolve(__vite_injected_original_dirname, "../../kysely/types.ts"),
        kysely: path.resolve(__vite_injected_original_dirname, "./kysely-types/index.ts"),
        "@calcom/dayjs": path.resolve(__vite_injected_original_dirname, "../../dayjs"),
        "@calcom/platform-constants": path.resolve(__vite_injected_original_dirname, "../constants/index.ts"),
        "@calcom/platform-types": path.resolve(__vite_injected_original_dirname, "../types/index.ts"),
        "@calcom/platform-utils": path.resolve(__vite_injected_original_dirname, "../constants/index.ts"),
        "@calcom/web/public/static/locales/en/common.json": path.resolve(
          __vite_injected_original_dirname,
          "../../../apps/web/public/static/locales/en/common.json"
        )
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdG9tYmF1ZXIvd29ya3NwYWNlL2dpdGh1Yi5jb20vVEJhdTIzL2dhdW50bGV0L2NhbC5jb20vcGFja2FnZXMvcGxhdGZvcm0vYXRvbXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy90b21iYXVlci93b3Jrc3BhY2UvZ2l0aHViLmNvbS9UQmF1MjMvZ2F1bnRsZXQvY2FsLmNvbS9wYWNrYWdlcy9wbGF0Zm9ybS9hdG9tcy92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdG9tYmF1ZXIvd29ya3NwYWNlL2dpdGh1Yi5jb20vVEJhdTIzL2dhdW50bGV0L2NhbC5jb20vcGFja2FnZXMvcGxhdGZvcm0vYXRvbXMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBkdHMgZnJvbSBcInZpdGUtcGx1Z2luLWR0c1wiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgXCJcIik7IC8vIC5lbnYgaW5zaWRlIG9mIHBhY2thZ2VzL3BsYXRmb3JtL2F0b21zXG4gIGNvbnN0IHdlYkFwcFVybCA9IGVudi5ORVhUX1BVQkxJQ19XRUJBUFBfVVJMID8/IFwiaHR0cHM6Ly9hcHAuY2FsLmNvbVwiO1xuICBjb25zdCBjYWxjb21WZXJzaW9uID0gZW52Lk5FWFRfUFVCTElDX0NBTENPTV9WRVJTSU9OID8/IFwiXCI7XG4gIGNvbnN0IHZlcmNlbENvbW1pdFNoYSA9IGVudi5ORVhUX1BVQkxJQ19WRVJDRUxfR0lUX0NPTU1JVF9TSEEgPz8gXCJcIjtcblxuICByZXR1cm4ge1xuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICBcIkBjYWxjb20vbGliXCIsXG4gICAgICAgIFwiQGNhbGNvbS9mZWF0dXJlc1wiLFxuICAgICAgICBcIkBjYWxjb20vcHJpc21hXCIsXG4gICAgICAgIFwiQGNhbGNvbS9kYXlqc1wiLFxuICAgICAgICBcIkBjYWxjb20vcGxhdGZvcm0tY29uc3RhbnRzXCIsXG4gICAgICAgIFwiQGNhbGNvbS9wbGF0Zm9ybS10eXBlc1wiLFxuICAgICAgICBcIkBjYWxjb20vcGxhdGZvcm0tdXRpbHNcIixcbiAgICAgIF0sXG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgZHRzKHtcbiAgICAgICAgaW5zZXJ0VHlwZXNFbnRyeTogdHJ1ZSxcbiAgICAgICAgYmVmb3JlV3JpdGVGaWxlOiAoZmlsZVBhdGgsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgY29udGVudCBpbmNsdWRlcyB0aGUgYnJva2VuIHBhdGggZnJvbSBreXNlbHlcbiAgICAgICAgICBpZiAoY29udGVudC5pbmNsdWRlcyhga3lzZWx5L3R5cGVzLnRzJykuJEVudW1zYCkpIHtcbiAgICAgICAgICAgIC8vIFJlcGxhY2UgdGhlIGJyb2tlbiBwYXRoIHdpdGggdGhlIGNvcnJlY3QgaW1wb3J0XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgY29udGVudDogY29udGVudC5yZXBsYWNlQWxsKGBreXNlbHkvdHlwZXMudHMnKS4kRW51bXNgLCBga3lzZWx5L3R5cGVzLnRzJylgKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7IGZpbGVQYXRoLCBjb250ZW50IH07XG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICBdLFxuICAgIGRlZmluZToge1xuICAgICAgXCJwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19XRUJBUFBfVVJMXCI6IGBcIiR7d2ViQXBwVXJsfVwiYCxcbiAgICAgIFwicHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQ0FMQ09NX1ZFUlNJT05cIjogYFwiJHtjYWxjb21WZXJzaW9ufVwiYCxcbiAgICAgIFwicHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfVkVSQ0VMX0dJVF9DT01NSVRfU0hBXCI6IGBcIiR7dmVyY2VsQ29tbWl0U2hhfVwiYCxcbiAgICAgIFwicHJvY2Vzcy5lbnYuTk9ERV9FTlZcIjogYFwiJHttb2RlfVwiYCxcbiAgICAgIFwicHJvY2Vzcy5lbnYuX19ORVhUX1JPVVRFUl9CQVNFUEFUSFwiOiBgXCJcImAsXG4gICAgICBcInByb2Nlc3MuZW52Ll9fTkVYVF9JMThOX1NVUFBPUlRcIjogYGZhbHNlYCxcbiAgICAgIFwicHJvY2Vzcy5lbnYuX19ORVhUX01BTlVBTF9UUkFJTElOR19TTEFTSFwiOiBgZmFsc2VgLFxuICAgICAgXCJwcm9jZXNzLmVudi5fX05FWFRfVFJBSUxJTkdfU0xBU0hcIjogYGZhbHNlYCxcbiAgICAgIFwicHJvY2Vzcy5lbnZcIjogXCJ7fVwiLFxuICAgIH0sXG4gICAgc3NyOiB7XG4gICAgICBub0V4dGVybmFsOiBbXCJ0dXJuZG93blwiXSwgLy8gRXhhbXBsZSBpZiB5b3Ugd2FudCB0byBkaXNhYmxlIFNTUiBmb3IgeW91ciBsaWJyYXJ5XG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiBbcmVzb2x2ZShfX2Rpcm5hbWUsIFwiaW5kZXgudHNcIildLFxuICAgICAgICBuYW1lOiBcIkNhbEF0b21zXCIsXG4gICAgICAgIGZpbGVOYW1lOiBcImNhbC1hdG9tc1wiLFxuICAgICAgICBcbiAgICAgIH0sXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgICAgXCJyZWFjdFwiLFxuICAgICAgICAgIFwiZnNcIixcbiAgICAgICAgICBcInBhdGhcIixcbiAgICAgICAgICBcIm9zXCIsXG4gICAgICAgICAgXCJyZWFjdC9qc3gtcnVudGltZVwiLFxuICAgICAgICAgIFwicmVhY3QtZG9tXCIsXG4gICAgICAgICAgXCJyZWFjdC1kb20vY2xpZW50XCIsXG4gICAgICAgICAgXCJAcHJpc21hL2NsaWVudFwiLFxuICAgICAgICAgIFwicmVhY3QvanN4LWRldi1ydW50aW1lXCIsXG4gICAgICAgICwgXCJyZWFjdC1hd2Vzb21lLXF1ZXJ5LWJ1aWxkZXJcIiwgXCJyZWFjdC1hd2Vzb21lLXF1ZXJ5LWJ1aWxkZXJcIiwgXCJyZWFjdC1hd2Vzb21lLXF1ZXJ5LWJ1aWxkZXJcIl0sXG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICAgIHJlYWN0OiBcIlJlYWN0XCIsXG4gICAgICAgICAgICBcInJlYWN0LWRvbVwiOiBcIlJlYWN0RE9NXCIsXG4gICAgICAgICAgICBcInJlYWN0L2pzeC1ydW50aW1lXCI6IFwiUmVhY3RKc3hSdW50aW1lXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICBmczogcmVzb2x2ZShcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yb2xsdXAtcGx1Z2luLW5vZGUtYnVpbHRpbnNcIiksXG4gICAgICAgIHBhdGg6IHJlc29sdmUoXCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcm9sbHVwLXBsdWdpbi1ub2RlLWJ1aWx0aW5zXCIpLFxuICAgICAgICBvczogcmVzb2x2ZShcIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9yb2xsdXAtcGx1Z2luLW5vZGUtYnVpbHRpbnNcIiksXG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgICBcIkBjYWxjb20vbGliL21hcmtkb3duVG9TYWZlSFRNTFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vbGliL21hcmtkb3duVG9TYWZlSFRNTFwiKSxcbiAgICAgICAgXCJAY2FsY29tL2xpYi9ob29rcy91c2VMb2NhbGVcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL2xpYi91c2VMb2NhbGVcIiksXG4gICAgICAgIFwiQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyYy9jb21wb25lbnRzL3VpL3Rvb2x0aXAudHN4XCIpLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kaWFsb2dcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyYy9jb21wb25lbnRzL3VpL2RpYWxvZy50c3hcIiksXG4gICAgICAgIFwiQGNhbGNvbS9wcmlzbWEvY2xpZW50L3J1bnRpbWUvbGlicmFyeVwiOiByZXNvbHZlKFwiLi9wcmlzbWEtdHlwZXMvaW5kZXgudHNcIiksXG4gICAgICAgIFwiQGNhbGNvbS9wcmlzbWEvY2xpZW50XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4va3lzZWx5L3R5cGVzLnRzXCIpLFxuICAgICAgICBreXNlbHk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9reXNlbHktdHlwZXMvaW5kZXgudHNcIiksXG4gICAgICAgIFwiQGNhbGNvbS9kYXlqc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uLy4uL2RheWpzXCIpLFxuICAgICAgICBcIkBjYWxjb20vcGxhdGZvcm0tY29uc3RhbnRzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vY29uc3RhbnRzL2luZGV4LnRzXCIpLFxuICAgICAgICBcIkBjYWxjb20vcGxhdGZvcm0tdHlwZXNcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi90eXBlcy9pbmRleC50c1wiKSxcbiAgICAgICAgXCJAY2FsY29tL3BsYXRmb3JtLXV0aWxzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vY29uc3RhbnRzL2luZGV4LnRzXCIpLFxuICAgICAgICBcIkBjYWxjb20vd2ViL3B1YmxpYy9zdGF0aWMvbG9jYWxlcy9lbi9jb21tb24uanNvblwiOiBwYXRoLnJlc29sdmUoXG4gICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgIFwiLi4vLi4vLi4vYXBwcy93ZWIvcHVibGljL3N0YXRpYy9sb2NhbGVzL2VuL2NvbW1vbi5qc29uXCJcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4YSxPQUFPLFdBQVc7QUFDaGMsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUN4QixTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFNBQVM7QUFKaEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sWUFBWSxJQUFJLDBCQUEwQjtBQUNoRCxRQUFNLGdCQUFnQixJQUFJLDhCQUE4QjtBQUN4RCxRQUFNLGtCQUFrQixJQUFJLHFDQUFxQztBQUVqRSxTQUFPO0FBQUEsSUFDTCxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixJQUFJO0FBQUEsUUFDRixrQkFBa0I7QUFBQSxRQUNsQixpQkFBaUIsQ0FBQyxVQUFVLFlBQVk7QUFF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
