const fs = require('fs');
const path = require('path');

const dirsToSearch = ['app', 'components', 'lib', 'emails', 'scripts', 'public'];
const excludeDirs = ['.next', 'node_modules', '.git', 'supabase/migrations', 'scratch'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!excludeDirs.some(ex => file.includes(ex))) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.json') || file.endsWith('.md')) {
        results.push(file);
      }
    }
  });
  return results;
}

let files = ['middleware.ts', 'tailwind.config.ts'].concat(dirsToSearch.flatMap(walk));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/contractors/g, 'employees');
  content = content.replace(/Contractors/g, 'Employees');
  content = content.replace(/CONTRACTORS/g, 'EMPLOYEES');
  
  content = content.replace(/contractor/g, 'employee');
  content = content.replace(/Contractor/g, 'Employee');
  content = content.replace(/CONTRACTOR/g, 'EMPLOYEE');
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
