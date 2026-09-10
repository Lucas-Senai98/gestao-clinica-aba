import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetFile = resolve(
  __dirname,
  "../node_modules/@tanstack/start-client-core/dist/esm/createServerFn.js"
);

if (existsSync(targetFile)) {
  let content = readFileSync(targetFile, "utf-8");
  if (!content.includes("validator: (inputValidator)")) {
    content = content.replace(
      /inputValidator:\s*\(inputValidator\)\s*=>\s*\{[\s\S]*?\},/,
      (match) => `${match}
		validator: (inputValidator) => {
			return createServerFn(void 0, {
				...resolvedOptions,
				inputValidator
			});
		},`
    );
    writeFileSync(targetFile, content);
    console.log("✅ Patched @tanstack/start-client-core createServerFn with validator alias");
  }
}
