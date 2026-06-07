const fs = require('fs');

function replaceInFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    let changed = false;
    for (const r of replacements) {
        if (typeof r.from === 'string' && content.includes(r.from)) {
            content = content.replace(r.from, r.to);
            changed = true;
        } else if (r.from instanceof RegExp && r.from.test(content)) {
            content = content.replace(r.from, r.to);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(path, content, 'utf8');
    }
}

replaceInFile('app/wegettinmoneynga/jobs/[id]/page.tsx', [
    { from: /import \{ Badge \} from '@\/components\/ui\/badge';\n/, to: '' },
    { from: /import \{ Input \} from '@\/components\/ui\/input';\n/, to: '' },
    { from: /import \{ Label \} from '@\/components\/ui\/label';\n/, to: '' },
    { from: /import \{ Textarea \} from '@\/components\/ui\/textarea';\n/, to: '' },
    { from: /import \{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger \} from '@\/components\/ui\/dialog';/, to: "import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';" },
    { from: /import \{ Select, SelectContent, SelectItem, SelectTrigger, SelectValue \} from '@\/components\/ui\/select';\n/, to: '' },
    { from: /import \{ Clock \} from 'lucide-react';\n/, to: '' },
    { from: /import \{ CheckCircle2 \} from 'lucide-react';\n/, to: '' },
    { from: /import \{ Clock, CheckCircle2 \} from 'lucide-react';\n/, to: '' }
]);

replaceInFile('app/wegettinmoneynga/jobs/page.tsx', [
    { from: /import \{ Calendar, MapPin, Search, Filter, ChevronRight, Plus \} from 'lucide-react';/, to: "import { Calendar, MapPin, Search, Filter, ChevronRight } from 'lucide-react';" }
]);

replaceInFile('app/wegettinmoneynga/layout.tsx', [
    { from: /import \{ Home, Users, Map, Briefcase, Settings, Target, BarChart3, LogOut, DollarSign, ListTodo, Package \} from 'lucide-react';/, to: "import { Home, Users, Map, Briefcase, Settings, Target, BarChart3, LogOut, ListTodo, Package } from 'lucide-react';" }
]);

replaceInFile('app/wegettinmoneynga/leads/[id]/page.tsx', [
    { from: /import \{ Badge \} from '@\/components\/ui\/badge';\n/, to: '' }
]);

replaceInFile('app/wegettinmoneynga/leads/page.tsx', [
    { from: /import \{ MapPin, Phone, Mail \} from 'lucide-react';/, to: "import { MapPin } from 'lucide-react';" },
    { from: /} catch \(err\) {/, to: "} catch { // err removed" }
]);

replaceInFile('app/wegettinmoneynga/payouts/page.tsx', [
    { from: /import \{ Button \} from '@\/components\/ui\/button';\n/, to: '' }
]);

replaceInFile('app/wegettinmoneynga/supply/page.tsx', [
    { from: /const \[creating, setCreating\] = useState\(false\);\n/, to: '' },
    { from: /const \[creating, setCreating\] = useState\(false\);/, to: '' }
]);

replaceInFile('app/wegettinmoneynga/teams/page.tsx', [
    { from: /const \[zones, setZones\] = useState<Zone\[\]>\(\[\]\);\n/, to: '' },
    { from: /fetch\('\/api\/zones'\)\.then\(r => r\.json\(\)\),/, to: '' },
    { from: /\]\)\.then\(\(\[teamsData, zonesData\]\) => \{/, to: "]).then(([teamsData]) => {" },
    { from: /setZones\(Array\.isArray\(zonesData\) \? zonesData : \[\]\);/, to: "" }
]);

replaceInFile('app/api/contractors/route.ts', [
    { from: /export async function GET\(_request: NextRequest\) \{/, to: "export async function GET() {" }
]);

replaceInFile('app/api/customers/route.ts', [
    { from: /export async function GET\(_request: NextRequest\) \{/, to: "export async function GET() {" }
]);

replaceInFile('app/api/payouts/[id]/mark-paid/route.ts', [
    { from: /const \{ amount \} = body;/, to: "" }
]);

replaceInFile('app/api/pricing/quote/route.ts', [
    { from: /const \{ zone_id, service_type, scheduled_date, home_size_sqft, home_bedrooms, home_bathrooms, has_pets, add_ons \} = body;/, to: "const { zone_id, service_type, scheduled_date, home_bedrooms, home_bathrooms, has_pets, add_ons } = body;" }
]);

replaceInFile('app/api/supply/inventory/route.ts', [
    { from: /import \{ createServiceClient \} from '@\/lib\/supabase\/server';/, to: "import { createClient } from '@/lib/supabase/server';" }
]);

replaceInFile('app/api/zones/route.ts', [
    { from: /export async function GET\(_request: NextRequest\) \{/, to: "export async function GET() {" }
]);

replaceInFile('app/contractor/availability/page.tsx', [
    { from: /import \{ Switch \} from '@\/components\/ui\/switch';\n/, to: '' }
]);

replaceInFile('app/contractor/jobs/[id]/page.tsx', [
    { from: /import \{ Camera \} from 'lucide-react';\n/, to: '' }
]);

replaceInFile('components/admin/map/DashboardSummaryPanel.tsx', [
    { from: /import type \{ ContractorLocation \} from '@\/types';\n/, to: '' },
    { from: /ContractorLocation, /, to: '' }
]);

replaceInFile('components/admin/map/JobPin.tsx', [
    { from: /import type \{ Job, JobStatus \} from '@\/types';/, to: "import type { Job } from '@/types';" }
]);

console.log("Fixes complete.");
