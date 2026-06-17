import fs from 'fs';
import path from 'path';

const files = [
  'components/contractor/AvailabilityModal.tsx',
  'app/booking/page.tsx',
  'app/wegettinmoneynga/jobs/new/page.tsx',
  'app/wegettinmoneynga/leads/page.tsx',
  'app/wegettinmoneynga/leads/[id]/page.tsx',
  'app/customer-site/quote/page.tsx',
  'app/customer-site/portal/quote/page.tsx',
  'app/partner/book/page.tsx',
  'app/contractor/expenses/page.tsx',
];

for (const file of files) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  
  let content = fs.readFileSync(p, 'utf-8');
  let modified = false;

  // Add import if not exists
  if (!content.includes('DatePicker') && content.includes('<Input') || content.includes('<input')) {
    if (content.includes("import { Input } from '@/components/ui/input';")) {
      content = content.replace(
        "import { Input } from '@/components/ui/input';",
        "import { Input } from '@/components/ui/input';\nimport { DatePicker } from '@/components/ui/date-picker';"
      );
    } else {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + "import { DatePicker } from '@/components/ui/date-picker';\n" + content.slice(endOfLastImport + 1);
    }
  }

  // Regex for <Input type="date" ... />
  const regex = /<Input\s+type="date"(.*?)\/>/gs;
  content = content.replace(regex, (match, attrs) => {
    modified = true;
    let newAttrs = attrs.replace(/onChange=\{([^}]+)\}/, (m, func) => {
      // convert e => update(..., e.target.value) to val => update(..., val)
      if (func.includes('e.target.value')) {
        const fixed = func.replace(/\([^)]*\)\s*=>|([a-zA-Z0-9_]+)\s*=>/, '(val) =>')
                          .replace(/e\.target\.value/g, 'val');
        return `onChange={${fixed}}`;
      }
      return m;
    });
    return `<DatePicker${newAttrs}/>`;
  });

  // Regex for <input type="date" ... />
  const regexNative = /<input([^>]*?)type="date"([^>]*?)\/>/gs;
  content = content.replace(regexNative, (match, attr1, attr2) => {
    modified = true;
    let attrs = attr1 + attr2;
    let newAttrs = attrs.replace(/onChange=\{([^}]+)\}/, (m, func) => {
      // convert e => update(..., e.target.value) to val => update(..., val)
      if (func.includes('e.target.value')) {
        const fixed = func.replace(/\([^)]*\)\s*=>|([a-zA-Z0-9_]+)\s*=>/, '(val) =>')
                          .replace(/e\.target\.value/g, 'val');
        return `onChange={${fixed}}`;
      }
      return m;
    });
    return `<DatePicker${newAttrs}/>`;
  });

  if (modified) {
    fs.writeFileSync(p, content);
    console.log('Updated', file);
  }
}
