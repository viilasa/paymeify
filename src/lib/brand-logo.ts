import { readFile } from "node:fs/promises";
import path from "node:path";

/** Local mark for OG / Twitter cards. */
export async function brandLogoSrc(): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), "public/brand/logo.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
