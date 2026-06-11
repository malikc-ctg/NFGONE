#!/bin/bash
# Upgrade requireAuth → requireRole(['admin']) in admin-only API routes
# Excludes contractor self-access routes (/me, /expenses, /available, /offers)

FILES=(
  "app/api/customers/route.ts"
  "app/api/disputes/[id]/route.ts"
  "app/api/disputes/route.ts"
  "app/api/finance/forecast/route.ts"
  "app/api/finance/pnl/route.ts"
  "app/api/jobs/[id]/dispatch/route.ts"
  "app/api/jobs/[id]/route.ts"
  "app/api/jobs/[id]/status/route.ts"
  "app/api/jobs/route.ts"
  "app/api/leads/[id]/convert/route.ts"
  "app/api/leads/[id]/route.ts"
  "app/api/leads/route.ts"
  "app/api/partners/[id]/book/route.ts"
  "app/api/partners/[id]/route.ts"
  "app/api/partners/invoices/route.ts"
  "app/api/partners/route.ts"
  "app/api/payouts/[id]/mark-paid/route.ts"
  "app/api/reviews/contractor-rating/route.ts"
  "app/api/reviews/route.ts"
  "app/api/supply/inventory/route.ts"
  "app/api/supply/restock/route.ts"
  "app/api/teams/[id]/members/route.ts"
  "app/api/teams/route.ts"
  "app/api/contractors/[id]/verify-insurance/route.ts"
)

cd /Users/malikcampbell/SeaOfBlue

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    # Replace import
    sed -i '' "s/import { requireAuth } from '@\/lib\/api-auth';/import { requireRole } from '@\/lib\/api-auth';/" "$f"
    # Replace function calls  
    sed -i '' "s/const auth = await requireAuth();/const auth = await requireRole(['admin']);/" "$f"
    # Update comment
    sed -i '' "s/\/\/ Auth check/\/\/ Admin-only/" "$f"
    echo "✅ $f"
  else
    echo "❌ NOT FOUND: $f"
  fi
done
