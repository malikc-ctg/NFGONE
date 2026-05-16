/**
 * Script to add requireAuth() guard to all API routes that don't have it.
 * Skips: cron routes (have their own CRON_SECRET auth), pricing/quote (public).
 * 
 * Run: node scripts/add-api-auth.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all route files
const result = execSync('find app/api -name "route.ts" | sort', { encoding: 'utf-8' });
const files = result.trim().split('\n');

// Routes to skip (public or already protected)
const skipPatterns = [
  'cron/',        // Protected by CRON_SECRET
  'pricing/',     // Public (booking flow)
];

const authImport = `import { requireAuth } from '@/lib/api-auth';`;
const authCheck = `  // Auth check\n  const auth = await requireAuth();\n  if (auth instanceof NextResponse) return auth;\n`;

let modified = 0;
let skipped = 0;

for (const file of files) {
  // Skip routes that don't need auth
  if (skipPatterns.some(p => file.includes(p))) {
    console.log(`SKIP (protected/public): ${file}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(file, 'utf-8');

  // Skip if already has auth
  if (content.includes('requireAuth') || content.includes('requireRole')) {
    console.log(`SKIP (already has auth): ${file}`);
    skipped++;
    continue;
  }

  // Add import at the top (after existing imports)
  if (!content.includes(authImport)) {
    // Find the last import line
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith("import {")) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, authImport);
      content = lines.join('\n');
    }
  }

  // Add auth check to each handler function (GET, POST, PATCH, PUT, DELETE)
  const handlers = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
  for (const handler of handlers) {
    // Match: export async function GET(...) {\n  try {
    const patternTry = new RegExp(
      `(export async function ${handler}\\([^)]*\\)\\s*\\{\\n)(\\s*try\\s*\\{)`,
      'g'
    );
    if (patternTry.test(content)) {
      content = content.replace(patternTry, `$1$2\n${authCheck}`);
    }
  }

  fs.writeFileSync(file, content);
  console.log(`MODIFIED: ${file}`);
  modified++;
}

console.log(`\nDone. Modified: ${modified}, Skipped: ${skipped}`);
