import { GET as getEmployees, POST as postEmployees } from '@/app/api/employees/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  return getEmployees();
}

export async function POST(req: any) {
  return postEmployees(req);
}
