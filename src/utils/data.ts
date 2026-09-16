import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ensureOreyBaseDirs, OREY_HOME_DIR } from "@/constants/paths";

function isInsideOreyHome(targetPath: string): boolean {
  const normalizedTarget = resolve(targetPath).toLowerCase();
  const normalizedHome = resolve(OREY_HOME_DIR).toLowerCase();
  return normalizedTarget.startsWith(normalizedHome);
}

export function writeData(filePath: string, data: any): void {
  try {
    if (!isInsideOreyHome(filePath)) {
      throw new Error(
        `File path ${filePath} is not within the \`~/.orey\` directory.`,
      );
    }
    ensureOreyBaseDirs();
    const dirName = dirname(filePath);
    if (!existsSync(dirName)){
        mkdirSync(dirName, { recursive: true });
    }
    const jsonData = JSON.stringify(data, null, 2);
    writeFileSync(filePath, jsonData, "utf-8");
  } catch (error) {
    console.error(`Error writing data to file ${filePath}:`, error);
    throw error;
  }
}

export function readData(filePath: string): any {
  try {
    if (!isInsideOreyHome(filePath)) {
      throw new Error(
        `File path ${filePath} is not within the \`~/.orey\` directory.`,
      );
    }
    if (!existsSync(filePath)) {
      throw new Error(`File ${filePath} does not exist.`);
    }
    const fileContent = readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading data from file ${filePath}:`, error);
    throw error;
  }
}
