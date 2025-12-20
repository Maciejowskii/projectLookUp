const fs = require("fs");
const path = require("path");

// Dodałem 'venv', '.venv', 'env', 'Lib', 'Scripts' do ignorowanych
const ignoreDirs = [
  "node_modules",
  ".next",
  ".git",
  ".vscode",
  "dist",
  "build",
  "venv",
  ".venv",
  "env",
  "__pycache__",
  "Lib",
  "Scripts",
  "Include",
];
const ignoreFiles = [
  "package-lock.json",
  "yarn.lock",
  ".DS_Store",
  "pnpm-lock.yaml",
];

function scanDir(dir, prefix = "") {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  // Sortujemy, żeby foldery były na górze (ładniejszy widok)
  files.sort((a, b) => {
    const aPath = path.join(dir, a);
    const bPath = path.join(dir, b);
    const aIsDir = fs.statSync(aPath).isDirectory();
    const bIsDir = fs.statSync(bPath).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  files.forEach((file, index) => {
    if (ignoreFiles.includes(file)) return;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const isLast = index === files.length - 1;
    const marker = isLast ? "└── " : "├── ";

    // Ignoruj ukryte pliki (chyba że to .env)
    if (file.startsWith(".") && !file.startsWith(".env")) return;

    if (stat.isDirectory()) {
      if (ignoreDirs.includes(file)) return;
      console.log(`${prefix}${marker}${file}/`);
      scanDir(fullPath, prefix + (isLast ? "    " : "│   "));
    } else {
      console.log(`${prefix}${marker}${file}`);
    }
  });
}

console.log("--- STRUKTURA PROJEKTU (BEZ ŚMIECI) ---");
scanDir(process.cwd());
console.log("---------------------------------------");
