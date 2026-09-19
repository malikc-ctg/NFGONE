'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Boxes,
  DollarSign,
  TrendingDown,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Upload,
  FileText,
  CheckCircle2,
  ShoppingCart,
  Wrench,
  Sparkles,
  Copy,
  Check,
  Truck,
  ArrowRight,
  SlidersHorizontal,
  Layers,
  Activity,
  QrCode,
  UserCheck,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// Types
export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category?: string;
  unit: string;
  reorder_threshold: number;
  cost_per_unit: number | null;
  supplier_url?: string | null;
  home_depot_sku?: string | null;
  amazon_asin?: string | null;
  preferred_store?: string | null;
  dilution_ratio?: string | null;
}

export interface InventoryRow {
  id: string;
  item_id: string;
  zone_id: string | null;
  quantity_on_hand: number;
  is_low_stock: boolean;
  last_restocked_at: string | null;
  last_updated: string | null;
  item: InventoryItem;
  zone: { id?: string; name: string } | null;
}

export interface ZoneOption {
  id: string;
  name: string;
}

export interface EquipmentAsset {
  id: string;
  name: string;
  model_number?: string | null;
  serial_number?: string | null;
  asset_tag: string;
  zone_id?: string | null;
  current_holder_id?: string | null;
  status: 'available' | 'checked_out' | 'in_maintenance' | 'damaged' | 'retired';
  condition: 'pristine' | 'good' | 'worn' | 'maintenance_needed' | 'damaged';
  total_runtime_hours: number;
  last_inspected_at?: string | null;
  notes?: string | null;
  holder?: { id: string; full_name: string; phone?: string } | null;
  zone?: { id: string; name: string } | null;
}

export interface DemandData {
  totalUpcomingJobs: number;
  jobsBreakdown: Record<string, number>;
  items: Array<{
    itemId: string;
    itemName: string;
    sku: string | null;
    category: string;
    unit: string;
    quantityOnHand: number;
    reorderThreshold: number;
    projectedBurn14Days: number;
    projectedEndStock: number;
    daysOfSupplyRemaining: number;
    costPerUnit: number;
    status: 'critical_stockout' | 'low_stock' | 'adequate';
    homeDepotSku?: string | null;
    amazonAsin?: string | null;
    preferredStore: string;
  }>;
  homeDepotShoppingList: Array<{
    itemId: string;
    name: string;
    storeCode: string;
    recommendedQty: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    reason: string;
    urgency: 'high' | 'medium';
    storeUrl?: string;
  }>;
  amazonShoppingList: Array<{
    itemId: string;
    name: string;
    storeCode: string;
    recommendedQty: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    reason: string;
    urgency: 'high' | 'medium';
    storeUrl?: string;
  }>;
  estimatedTotalRestockBudget: number;
}

export interface ParsedPurchaseItem {
  rawIdentifier: string;
  rawDescription: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  matchedItemId?: string;
  matchedItemName?: string;
  confidence: number;
}

export interface ParsedPurchasePreview {
  vendorName: string;
  source: string;
  orderReference: string;
  purchaseDate: string;
  totalAmount: number;
  items: ParsedPurchaseItem[];
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Categories' },
  { id: 'chemical', label: 'Chemicals & Solutions' },
  { id: 'consumable', label: 'Consumables & Wear' },
  { id: 'ppe', label: 'PPE & Safety' },
  { id: 'paper', label: 'Paper & Restroom' },
  { id: 'equipment', label: 'Durable Equipment' },
  { id: 'tool', label: 'Tools & Hardware' },
];

export default function EnterpriseSupplyPage() {
  // Main Data States
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentAsset[]>([]);
  const [demand, setDemand] = useState<DemandData | null>(null);
  const [contractors, setContractors] = useState<Array<{ id: string; full_name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'inventory' | 'demand' | 'reconciler' | 'equipment' | 'dispatch'>('inventory');

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // Add Item Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'chemical',
    unit: 'bottles',
    initial_quantity: '20',
    reorder_threshold: '10',
    cost_per_unit: '8.50',
    zone_id: 'all',
    home_depot_sku: '',
    amazon_asin: '',
    preferred_store: 'Home Depot',
    dilution_ratio: '',
    supplier_url: '',
  });

  // Restock Dialog
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restocking, setRestocking] = useState(false);

  // CSV Reconciler State
  const [csvRawText, setCsvRawText] = useState('');
  const [parsingCsv, setParsingCsv] = useState(false);
  const [reconcilePreview, setReconcilePreview] = useState<ParsedPurchasePreview | null>(null);
  const [reconcileTargetZone, setReconcileTargetZone] = useState<string>('all');
  const [committingReconcile, setCommittingReconcile] = useState(false);
  const [qboSyncing, setQboSyncing] = useState(false);

  // Equipment Custody Dialog
  const [custodyOpen, setCustodyOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<EquipmentAsset | null>(null);
  const [custodyAction, setCustodyAction] = useState<'checkout' | 'checkin' | 'maintenance'>('checkout');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [reportedCondition, setReportedCondition] = useState<EquipmentAsset['condition']>('good');
  const [custodyNotes, setCustodyNotes] = useState('');
  const [updatingCustody, setUpdatingCustody] = useState(false);

  // Rapid Dispatch Scanner State
  const [scanQuery, setScanQuery] = useState('');
  const [scannedResult, setScannedResult] = useState<EquipmentAsset | InventoryRow | null>(null);

  // Stock Stepper Tracking
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedList, setCopiedList] = useState<'hd' | 'amz' | null>(null);

  // Load All System Data
  async function loadAllData(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [invRes, zonesRes, equipRes, demandRes, contractorsRes] = await Promise.all([
        fetch('/api/supply/inventory'),
        fetch('/api/zones'),
        fetch('/api/supply/equipment'),
        fetch('/api/supply/demand'),
        fetch('/api/contractors').catch(() => null),
      ]);

      const invData = await invRes.json();
      const zonesData = await zonesRes.json();
      const equipData = await equipRes.json();
      const demandData = await demandRes.json();

      setInventory(Array.isArray(invData) ? invData : []);
      setZones(Array.isArray(zonesData) ? zonesData : []);
      if (equipData?.assets) setEquipment(equipData.assets);
      if (demandData && !demandData.error) setDemand(demandData);

      if (contractorsRes && contractorsRes.ok) {
        const cData = await contractorsRes.json();
        if (Array.isArray(cData)) setContractors(cData);
      }
    } catch (err) {
      console.error('Failed to load supply data:', err);
      toast.error('Failed to load supply intelligence data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Quick Delta Adjustment (+1 / -1)
  async function handleQuickAdjust(row: InventoryRow, delta: number) {
    const newQty = Math.max(0, row.quantity_on_hand + delta);
    setUpdatingId(row.id);

    setInventory((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              quantity_on_hand: newQty,
              is_low_stock: newQty <= (r.item?.reorder_threshold ?? 10),
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/supply/inventory/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setInventory((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
    } catch {
      toast.error('Failed to update stock quantity');
      loadAllData(true);
    } finally {
      setUpdatingId(null);
    }
  }

  // Filtered Rows for Inventory Table
  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inventory.filter((row) => {
      const item = row.item || {};
      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.home_depot_sku?.toLowerCase().includes(q) ||
        item.amazon_asin?.toLowerCase().includes(q) ||
        row.zone?.name?.toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === 'all' ? true : (item.category || 'consumable') === categoryFilter;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'low'
          ? row.is_low_stock
          : !row.is_low_stock;

      const matchZone =
        zoneFilter === 'all'
          ? true
          : zoneFilter === 'unassigned'
          ? !row.zone_id
          : row.zone_id === zoneFilter;

      return matchSearch && matchCategory && matchStatus && matchZone;
    });
  }, [inventory, search, categoryFilter, statusFilter, zoneFilter]);

  // Aggregate Metrics
  const totalValuation = inventory.reduce(
    (sum, r) => sum + (r.quantity_on_hand || 0) * (r.item?.cost_per_unit || 0),
    0
  );
  const totalUnits = inventory.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0);
  const lowStockRows = inventory.filter((r) => r.is_low_stock);
  const activeEquipmentOut = equipment.filter((e) => e.status === 'checked_out');

  // Handle Create Supply Item
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    setSubmittingItem(true);
    try {
      const res = await fetch('/api/supply/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create item');
      }
      const createdRow = await res.json();
      setInventory((prev) => [createdRow, ...prev]);
      toast.success(`${newItem.name} added to catalog & stock!`);
      setAddOpen(false);
      setNewItem({
        name: '',
        sku: '',
        category: 'chemical',
        unit: 'bottles',
        initial_quantity: '20',
        reorder_threshold: '10',
        cost_per_unit: '8.50',
        zone_id: 'all',
        home_depot_sku: '',
        amazon_asin: '',
        preferred_store: 'Home Depot',
        dilution_ratio: '',
        supplier_url: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create item');
    } finally {
      setSubmittingItem(false);
    }
  }

  // Handle Quick Restock
  async function handleConfirmRestock() {
    if (!selectedRow || restockQty <= 0) return;
    setRestocking(true);
    try {
      const res = await fetch('/api/supply/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedRow.item_id,
          zone_id: selectedRow.zone_id,
          quantity_ordered: restockQty,
          auto_receive: true,
        }),
      });
      if (!res.ok) throw new Error('Restock failed');
      toast.success(`Restocked +${restockQty} ${selectedRow.item.unit} of ${selectedRow.item.name}!`);
      setRestockOpen(false);
      await loadAllData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to restock');
    } finally {
      setRestocking(false);
    }
  }

  // Handle CSV Parsing (Home Depot Pro Xtra or Amazon)
  async function handleParseCSV(e?: React.ChangeEvent<HTMLInputElement>) {
    let contentToParse = csvRawText;
    if (e?.target?.files?.[0]) {
      const file = e.target.files[0];
      contentToParse = await file.text();
      setCsvRawText(contentToParse);
    }

    if (!contentToParse.trim()) {
      toast.error('Please upload a CSV file or paste CSV text');
      return;
    }

    setParsingCsv(true);
    try {
      const res = await fetch('/api/supply/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: contentToParse }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse CSV');
      }
      const preview: ParsedPurchasePreview = await res.json();
      setReconcilePreview(preview);
      toast.success(`Parsed ${preview.items.length} items from ${preview.vendorName}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse purchase CSV');
    } finally {
      setParsingCsv(false);
    }
  }

  // Handle QBO Sync
  async function handleSyncQboPurchases() {
    setQboSyncing(true);
    try {
      const res = await fetch('/api/supply/reconciliation/qbo-sync');
      if (!res.ok) throw new Error('QuickBooks sync failed');
      const data = await res.json();
      if (data.purchases && data.purchases.length > 0) {
        setReconcilePreview(data.purchases[0]);
        toast.success(`Found ${data.count} recent supply purchases in QuickBooks! Loaded latest.`);
      } else {
        toast.info('No new Home Depot or Amazon purchases found in QuickBooks for the past 60 days.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync with QuickBooks');
    } finally {
      setQboSyncing(false);
    }
  }

  // Commit Reconciled Items into Zone Stock
  async function handleCommitReconciliation() {
    if (!reconcilePreview || reconcilePreview.items.length === 0) return;
    setCommittingReconcile(true);
    try {
      const res = await fetch('/api/supply/reconciliation/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reconcilePreview,
          zoneId: reconcileTargetZone,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reconcile');
      }
      const data = await res.json();
      toast.success(data.message || 'Stock successfully updated!');
      setReconcilePreview(null);
      setCsvRawText('');
      await loadAllData(true);
      setActiveTab('inventory');
    } catch (err: any) {
      toast.error(err.message || 'Failed to commit reconciliation');
    } finally {
      setCommittingReconcile(false);
    }
  }

  // Equipment Custody Update
  async function handleSaveCustody() {
    if (!selectedAsset) return;
    setUpdatingCustody(true);
    try {
      const res = await fetch(`/api/supply/equipment/${selectedAsset.id}/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: custodyAction,
          contractorId: custodyAction === 'checkout' ? selectedContractorId : null,
          condition: reportedCondition,
          notes: custodyNotes,
        }),
      });
      if (!res.ok) throw new Error('Failed to update custody');
      const data = await res.json();
      toast.success(`${selectedAsset.asset_tag} custody updated!`);
      setEquipment((prev) => prev.map((e) => (e.id === selectedAsset.id ? data.asset : e)));
      setCustodyOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update asset custody');
    } finally {
      setUpdatingCustody(false);
    }
  }

  // Copy Shopping List to Clipboard
  function copyShoppingListToClipboard(type: 'hd' | 'amz') {
    if (!demand) return;
    const list = type === 'hd' ? demand.homeDepotShoppingList : demand.amazonShoppingList;
    const storeName = type === 'hd' ? 'THE HOME DEPOT RESTOCK LIST' : 'AMAZON SUPPLY RESTOCK LIST';

    const text = [
      `=== ${storeName} ===`,
      `Generated: ${new Date().toLocaleDateString()} | Sea of Blue Ops`,
      '',
      ...list.map(
        (item, idx) =>
          `${idx + 1}. [${item.storeCode}] ${item.name} — QTY: ${item.recommendedQty} ${item.unit} (~$${item.totalCost})`
      ),
      '',
      `Estimated Budget: $${list.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)} CAD`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedList(type);
    toast.success(`${type === 'hd' ? 'Home Depot' : 'Amazon'} list copied to clipboard!`);
    setTimeout(() => setCopiedList(null), 2500);
  }

  // Rapid Scan Lookup
  function handleScanLookup() {
    const q = scanQuery.toUpperCase().trim();
    if (!q) return;

    // Check equipment tags first
    const eqMatch = equipment.find(
      (e) => e.asset_tag.toUpperCase() === q || e.serial_number?.toUpperCase() === q
    );
    if (eqMatch) {
      setScannedResult(eqMatch);
      toast.success(`Found Machinery Asset: ${eqMatch.asset_tag}`);
      return;
    }

    // Check supply SKU
    const invMatch = inventory.find(
      (r) =>
        r.item.sku?.toUpperCase() === q ||
        r.item.home_depot_sku?.toUpperCase() === q ||
        r.item.amazon_asin?.toUpperCase() === q
    );
    if (invMatch) {
      setScannedResult(invMatch);
      toast.success(`Found Supply Item: ${invMatch.item.name}`);
      return;
    }

    toast.error(`No equipment asset or supply SKU matching "${q}"`);
    setScannedResult(null);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Supply OS <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">Enterprise</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Central depots, mobile fleet kits, Home Depot Pro Xtra reconciler, and predictive runout intelligence
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('reconciler')}
            className="h-9 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-800"
          >
            <Upload className="h-4 w-4 mr-1.5 text-blue-600" />
            Ingest Receipts
          </Button>

          <Button size="sm" onClick={() => setAddOpen(true)} className="h-9">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Supply Item
          </Button>
        </div>
      </div>

      {/* High-Level Intelligence Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valuation */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total On-Hand Valuation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${totalValuation.toFixed(2)} CAD</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{totalUnits} physical units</span> across {zones.length || 1} regional hubs
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Stockout Alerts */}
        <Card className={`shadow-sm ${lowStockRows.length > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Restock Runout Alerts
            </CardTitle>
            <TrendingDown className={`h-4 w-4 ${lowStockRows.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold tracking-tight ${lowStockRows.length > 0 ? 'text-amber-700' : ''}`}>
                {lowStockRows.length}
              </span>
              {lowStockRows.length > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  Action Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {demand ? `${demand.totalUpcomingJobs} upcoming jobs burning stock` : 'Projected from active bookings'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Machinery Deployed */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Equipment In Field
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-blue-700">
                {activeEquipmentOut.length} / {equipment.length}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {equipment.length > 0 ? `${Math.round((activeEquipmentOut.length / equipment.length) * 100)}% deployed` : '0%'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">HEPA Vacuums, Extractors & Ozone</p>
          </CardContent>
        </Card>

        {/* Card 4: Store Run Shopping Budget */}
        <Card className="shadow-sm border-blue-100 bg-gradient-to-br from-blue-50/20 to-indigo-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Est. Store Run Budget
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-indigo-900">
              ${(demand?.estimatedTotalRestockBudget || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Home Depot Pro Xtra + Amazon needed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Mode Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-1.5 rounded-xl border">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2">
              <Boxes className="h-3.5 w-3.5 mr-1.5" />
              Stock & Catalog
            </TabsTrigger>
            <TabsTrigger value="demand" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2">
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Store Run Lists
              {demand && (demand.homeDepotShoppingList.length > 0 || demand.amazonShoppingList.length > 0) && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 font-bold">
                  {demand.homeDepotShoppingList.length + demand.amazonShoppingList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reconciler" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2">
              <Upload className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              Pro Xtra & QBO Reconciler
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Equipment & Custody
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2">
              <QrCode className="h-3.5 w-3.5 mr-1.5" />
              QR Dispatch Station
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INVENTORY & CATALOG MATRIX                                         */}
        {/* ========================================================================= */}
        <TabsContent value="inventory" className="space-y-4 m-0">
          {/* Category Rail Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search item, SKU, Home Depot #, or ASIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                  <SelectItem value="ok">Adequate Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-44 h-9 text-xs">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs & Lockers</SelectItem>
                  <SelectItem value="unassigned">Central Hub (Unassigned)</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground self-center">
              Showing {filteredInventory.length} of {inventory.length} supply items
            </div>
          </div>

          {/* Main Inventory Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[300px]">Product & Codes</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Zone Location</TableHead>
                    <TableHead className="text-center">Stock On Hand</TableHead>
                    <TableHead className="text-right">Reorder Min</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading supply catalog...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="font-medium text-foreground">No supply items found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your category or search filter, or add a new supply item.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((row) => {
                      const itemValue = (row.quantity_on_hand || 0) * (row.item?.cost_per_unit || 0);
                      const cat = row.item?.category || 'consumable';

                      return (
                        <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                          {/* Item & Codes */}
                          <TableCell>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {row.item?.name}
                              {row.item?.supplier_url && (
                                <a
                                  href={row.item.supplier_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                  title="Product link"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {row.item?.sku && (
                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {row.item.sku}
                                </span>
                              )}
                              {row.item?.home_depot_sku && (
                                <span className="font-mono text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                  HD #{row.item.home_depot_sku}
                                </span>
                              )}
                              {row.item?.amazon_asin && (
                                <span className="font-mono text-[10px] bg-orange-500/10 text-orange-700 border border-orange-500/20 px-1.5 py-0.5 rounded">
                                  ASIN: {row.item.amazon_asin}
                                </span>
                              )}
                              {row.item?.dilution_ratio && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                  {row.item.dilution_ratio}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Category Badge */}
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[11px] font-normal">
                              {cat}
                            </Badge>
                          </TableCell>

                          {/* Location */}
                          <TableCell className="text-xs">
                            {row.zone?.name ? (
                              <Badge variant="secondary" className="font-normal text-xs">
                                {row.zone.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground italic">Central Hub</span>
                            )}
                          </TableCell>

                          {/* Stock Stepper */}
                          <TableCell className="text-center">
                            <div className="inline-flex items-center border rounded-lg overflow-hidden bg-background shadow-xs">
                              <button
                                onClick={() => handleQuickAdjust(row, -1)}
                                disabled={updatingId === row.id || row.quantity_on_hand <= 0}
                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                                title="Decrease stock by 1"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <span
                                className={`px-2.5 text-xs font-bold min-w-[2.5rem] text-center ${
                                  row.is_low_stock ? 'text-amber-700' : 'text-foreground'
                                }`}
                              >
                                {row.quantity_on_hand}
                              </span>
                              <button
                                onClick={() => handleQuickAdjust(row, +1)}
                                disabled={updatingId === row.id}
                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Increase stock by 1"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>

                          {/* Reorder Min */}
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {row.item?.reorder_threshold ?? '—'}
                          </TableCell>

                          {/* Unit Cost */}
                          <TableCell className="text-right text-xs font-mono">
                            {row.item?.cost_per_unit != null
                              ? `$${row.item.cost_per_unit.toFixed(2)}`
                              : '—'}
                          </TableCell>

                          {/* Valuation */}
                          <TableCell className="text-right text-xs font-mono font-medium">
                            ${itemValue.toFixed(2)}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {row.is_low_stock ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
                              >
                                In Stock
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right pr-6 space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-medium"
                              onClick={() => {
                                setSelectedRow(row);
                                setRestockQty(
                                  row.item?.reorder_threshold ? row.item.reorder_threshold * 2 : 20
                                );
                                setRestockOpen(true);
                              }}
                            >
                              Restock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: STORE-READY SHOPPING LISTS (HOME DEPOT & AMAZON)                   */}
        {/* ========================================================================= */}
        <TabsContent value="demand" className="space-y-6 m-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-blue-50/60 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-950">
                  Predictive Demand & Store Run Lists
                </h3>
                <p className="text-xs text-blue-800/90 mt-0.5">
                  Calculated against {demand?.totalUpcomingJobs || 0} scheduled bookings across standard, deep, and move-out cleans.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShoppingListToClipboard('hd')}
                className="text-xs h-8 bg-white border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                {copiedList === 'hd' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy Home Depot List
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShoppingListToClipboard('amz')}
                className="text-xs h-8 bg-white border-orange-300 text-orange-800 hover:bg-orange-50"
              >
                {copiedList === 'amz' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy Amazon List
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* The Home Depot Store Run Card */}
            <Card className="shadow-sm border-amber-200">
              <CardHeader className="bg-amber-50/40 border-b border-amber-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <CardTitle className="text-base font-bold text-amber-950">
                      The Home Depot Store Run
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                    Pro Xtra Eligible
                  </Badge>
                </div>
                <CardDescription className="text-xs text-amber-800/80">
                  Store SKUs & recommended pack sizes for your next warehouse run
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {!demand || demand.homeDepotShoppingList.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    All Home Depot supplies adequately stocked for upcoming jobs!
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {demand.homeDepotShoppingList.map((item) => (
                      <div key={item.itemId} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{item.name}</span>
                            <span className="font-mono text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                              {item.storeCode}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground">
                            +{item.recommendedQty} {item.unit}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ~${item.totalCost.toFixed(2)} CAD
                          </div>
                          {item.storeUrl && (
                            <a
                              href={item.storeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              HomeDepot.ca <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amazon & Specialty Online Order Card */}
            <Card className="shadow-sm border-orange-200">
              <CardHeader className="bg-orange-50/40 border-b border-orange-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <CardTitle className="text-base font-bold text-orange-950">
                      Amazon Business & Online Orders
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-900 border-orange-300 text-xs">
                    Prime / Fast Delivery
                  </Badge>
                </div>
                <CardDescription className="text-xs text-orange-800/80">
                  Bulk order items with direct ASIN buy links
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {!demand || demand.amazonShoppingList.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    All Amazon order supplies adequately stocked!
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {demand.amazonShoppingList.map((item) => (
                      <div key={item.itemId} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{item.name}</span>
                            <span className="font-mono text-[11px] bg-orange-50 text-orange-800 border border-orange-200 px-1.5 py-0.2 rounded font-medium">
                              {item.storeCode}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground">
                            +{item.recommendedQty} {item.unit}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ~${item.totalCost.toFixed(2)} CAD
                          </div>
                          {item.storeUrl && (
                            <a
                              href={item.storeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              Amazon.ca <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: UNIVERSAL PURCHASE RECONCILER (HOME DEPOT, AMAZON, QBO)           */}
        {/* ========================================================================= */}
        <TabsContent value="reconciler" className="space-y-6 m-0">
          <Card className="shadow-sm border-blue-200">
            <CardHeader className="bg-blue-50/40 border-b border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-950">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Universal Receipt & Purchase Ingestion Engine
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-800/80 mt-0.5">
                    Drop Home Depot Pro Xtra CSVs, Amazon Order History exports, or pull purchases directly from QuickBooks
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncQboPurchases}
                  disabled={qboSyncing}
                  className="bg-white border-blue-300 text-blue-900 hover:bg-blue-50 h-8 text-xs font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${qboSyncing ? 'animate-spin' : ''}`} />
                  Sync QuickBooks Expenses
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Dropzone / Upload Area */}
              <div className="border-2 border-dashed border-blue-300/80 bg-blue-50/20 hover:bg-blue-50/40 transition-colors rounded-xl p-6 text-center">
                <FileText className="h-10 w-10 text-blue-500 mx-auto mb-3 opacity-80" />
                <h4 className="text-sm font-semibold text-foreground">
                  Upload Home Depot Pro Xtra or Amazon Orders CSV
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Drag & drop your downloaded purchase export from Home Depot Pro Xtra or Amazon. The parser will auto-match SKUs and categories.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleParseCSV}
                    />
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-colors">
                      Choose CSV File
                    </span>
                  </label>
                </div>
              </div>

              {/* Or Paste Raw Text */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Or paste CSV text directly:
                </Label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder="Paste CSV text with SKU, Description, Qty, Price..."
                    className="w-full text-xs font-mono p-2.5 rounded-lg border bg-background resize-none"
                  />
                  <Button
                    onClick={() => handleParseCSV()}
                    disabled={parsingCsv || !csvRawText.trim()}
                    className="self-end h-9 text-xs shrink-0"
                  >
                    {parsingCsv ? 'Parsing...' : 'Parse'}
                  </Button>
                </div>
              </div>

              {/* Parsed Preview Table */}
              {reconcilePreview && (
                <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white text-xs">
                          {reconcilePreview.vendorName}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          Order #{reconcilePreview.orderReference}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({reconcilePreview.purchaseDate})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Found {reconcilePreview.items.length} items totaling ${reconcilePreview.totalAmount.toFixed(2)} CAD
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-48">
                        <Select
                          value={reconcileTargetZone}
                          onValueChange={setReconcileTargetZone}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Target Zone Hub" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Central Depot (All Zones)</SelectItem>
                            {zones.map((z) => (
                              <SelectItem key={z.id} value={z.id}>
                                {z.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleCommitReconciliation}
                        disabled={committingReconcile}
                        className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {committingReconcile ? 'Adding to Stock...' : 'Confirm & Add to Stock'}
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Receipt SKU / ASIN</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Catalog Match</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconcilePreview.items.map((item, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-mono text-muted-foreground">
                            {item.rawIdentifier || '—'}
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {item.rawDescription}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            +{item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${item.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.matchedItemId ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" /> {item.matchedItemName || 'Matched'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px]">
                                New Catalog Item
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: DURABLE EQUIPMENT & CLEANER CUSTODY BOARD                           */}
        {/* ========================================================================= */}
        <TabsContent value="equipment" className="space-y-6 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Machinery Fleet & Active Custody
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Serialized HEPA backpack vacuums, carpet extractors, ozone machines, and cleaner shift assignments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((asset) => {
              const isCheckedOut = asset.status === 'checked_out';
              const isMaint = asset.status === 'in_maintenance';

              return (
                <Card
                  key={asset.id}
                  className={`shadow-sm transition-all border ${
                    isCheckedOut
                      ? 'border-blue-300 bg-blue-50/20'
                      : isMaint
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <CardHeader className="pb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border text-foreground">
                        {asset.asset_tag}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${
                          isCheckedOut
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : isMaint
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground leading-snug">
                      {asset.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      SN: {asset.serial_number || 'N/A'} • Model: {asset.model_number || 'N/A'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/40 space-y-1.5">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Current Custodian:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {asset.holder ? (
                            <>
                              <UserCheck className="h-3 w-3 text-blue-600" />
                              {asset.holder.full_name}
                            </>
                          ) : (
                            <span className="italic text-muted-foreground">In Depot / Available</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Condition:</span>
                        <Badge variant="secondary" className="capitalize text-[10px] font-normal">
                          {asset.condition.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Total Runtime:</span>
                        <span className="font-mono font-medium text-foreground">
                          {asset.total_runtime_hours} hrs
                        </span>
                      </div>
                    </div>

                    {asset.notes && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        "{asset.notes}"
                      </p>
                    )}

                    <div className="pt-1 flex gap-2">
                      {isCheckedOut ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-8 border-blue-300 text-blue-800 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setCustodyAction('checkin');
                            setReportedCondition(asset.condition);
                            setCustodyOpen(true);
                          }}
                        >
                          Return & Inspect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setCustodyAction('checkout');
                            setReportedCondition(asset.condition);
                            setCustodyOpen(true);
                          }}
                        >
                          Check Out to Cleaner
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: QR DISPATCH & SCANNER STATION                                      */}
        {/* ========================================================================= */}
        <TabsContent value="dispatch" className="space-y-6 m-0">
          <Card className="shadow-sm max-w-xl mx-auto">
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2">
                <QrCode className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold">QR & Barcode Dispatch Station</CardTitle>
              <CardDescription className="text-xs">
                Scan or enter an equipment tag (e.g. EQ-VAC-01) or supply SKU for morning rollout or evening return
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or type asset tag (e.g. EQ-VAC-01)..."
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanLookup()}
                  className="font-mono text-sm uppercase"
                />
                <Button onClick={handleScanLookup} className="text-xs">
                  Scan / Lookup
                </Button>
              </div>

              {scannedResult && 'asset_tag' in scannedResult && (
                <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                      {scannedResult.asset_tag}
                    </span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {scannedResult.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{scannedResult.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Current Custodian: {scannedResult.holder?.full_name || 'In Depot'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {scannedResult.status === 'checked_out' ? (
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedAsset(scannedResult as EquipmentAsset);
                          setCustodyAction('checkin');
                          setCustodyOpen(true);
                        }}
                      >
                        Return & Complete Inspection
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setSelectedAsset(scannedResult as EquipmentAsset);
                          setCustodyAction('checkout');
                          setCustodyOpen(true);
                        }}
                      >
                        Check Out to Cleaner
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG: ADD SUPPLY ITEM                                                   */}
      {/* ========================================================================= */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supply Item</DialogTitle>
            <DialogDescription className="text-xs">
              Register a consumable, dilution chemical, or tool into the Sea of Blue catalog
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-3.5 pt-2 text-xs">
            <div>
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                placeholder="e.g. Heavy-Duty Citrus Degreaser"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-category">Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(val) => setNewItem({ ...newItem, category: val })}
                >
                  <SelectTrigger id="item-category" className="mt-1 text-xs capitalize">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chemical">Chemicals & Solutions</SelectItem>
                    <SelectItem value="consumable">Consumables & Wear</SelectItem>
                    <SelectItem value="ppe">PPE & Safety</SelectItem>
                    <SelectItem value="paper">Paper & Restroom</SelectItem>
                    <SelectItem value="tool">Tools & Hardware</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="item-unit">Unit of Measure</Label>
                <Input
                  id="item-unit"
                  placeholder="e.g. bottles, packs, gallons"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hd-sku">Home Depot Store SKU</Label>
                <Input
                  id="hd-sku"
                  placeholder="e.g. 1001-554-921"
                  value={newItem.home_depot_sku}
                  onChange={(e) => setNewItem({ ...newItem, home_depot_sku: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <Label htmlFor="amz-asin">Amazon ASIN</Label>
                <Input
                  id="amz-asin"
                  placeholder="e.g. B08X4W9K2L"
                  value={newItem.amazon_asin}
                  onChange={(e) => setNewItem({ ...newItem, amazon_asin: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="initial-stock">Initial Stock</Label>
                <Input
                  id="initial-stock"
                  type="number"
                  min="0"
                  value={newItem.initial_quantity}
                  onChange={(e) => setNewItem({ ...newItem, initial_quantity: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="min-reorder">Reorder Alert</Label>
                <Input
                  id="min-reorder"
                  type="number"
                  min="1"
                  value={newItem.reorder_threshold}
                  onChange={(e) => setNewItem({ ...newItem, reorder_threshold: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="unit-cost">Cost / Unit ($)</Label>
                <Input
                  id="unit-cost"
                  type="number"
                  step="0.01"
                  value={newItem.cost_per_unit}
                  onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target-zone">Initial Hub Location</Label>
              <Select
                value={newItem.zone_id}
                onValueChange={(val) => setNewItem({ ...newItem, zone_id: val })}
              >
                <SelectTrigger id="target-zone" className="mt-1 text-xs">
                  <SelectValue placeholder="All Zones (Central Depot)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Central Depot (General Inventory)</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingItem} className="text-xs">
                {submittingItem ? 'Saving...' : 'Add to Catalog'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: QUICK RESTOCK                                                     */}
      {/* ========================================================================= */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Restock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-semibold text-sm">{selectedRow?.item?.name}</p>
              <div className="flex items-center justify-between text-muted-foreground mt-1">
                <span>Current on hand: {selectedRow?.quantity_on_hand} {selectedRow?.item?.unit}</span>
                <span>Threshold: {selectedRow?.item?.reorder_threshold}</span>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Quick Presets</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {[5, 10, 25, 50].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={restockQty === preset ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    onClick={() => setRestockQty(preset)}
                  >
                    +{preset}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-qty">Custom Units to Add</Label>
              <Input
                id="custom-qty"
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(parseInt(e.target.value, 10) || 0)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRestockOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRestock}
                disabled={restocking || restockQty <= 0}
                className="text-xs font-semibold"
              >
                {restocking ? 'Adding...' : `Add +${restockQty} Units`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EQUIPMENT CUSTODY CHECKOUT & RETURN                               */}
      {/* ========================================================================= */}
      <Dialog open={custodyOpen} onOpenChange={setCustodyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {custodyAction === 'checkout' ? 'Check Out Equipment' : 'Return & Inspect Equipment'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedAsset?.asset_tag} — {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {custodyAction === 'checkout' ? (
              <div>
                <Label htmlFor="cleaner-select">Assign to Cleaner / Crew *</Label>
                <Select
                  value={selectedContractorId}
                  onValueChange={setSelectedContractorId}
                >
                  <SelectTrigger id="cleaner-select" className="mt-1 text-xs">
                    <SelectValue placeholder="Select active technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.length > 0 ? (
                      contractors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="demo-tech-1">Marcus Sterling (Lead Technician)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="condition-select">Return Inspection Condition *</Label>
                <Select
                  value={reportedCondition}
                  onValueChange={(val: any) => setReportedCondition(val)}
                >
                  <SelectTrigger id="condition-select" className="mt-1 text-xs capitalize">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pristine">Pristine (Clean & Like New)</SelectItem>
                    <SelectItem value="good">Good (Normal Field Use)</SelectItem>
                    <SelectItem value="worn">Worn (Minor Scuffs/Wear)</SelectItem>
                    <SelectItem value="maintenance_needed">Maintenance Needed (Filter/Nozzle)</SelectItem>
                    <SelectItem value="damaged">Damaged (Requires Repair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="custody-notes">Notes / Inspection Comments</Label>
              <textarea
                id="custody-notes"
                rows={2}
                value={custodyNotes}
                onChange={(e) => setCustodyNotes(e.target.value)}
                placeholder="e.g. HEPA filter checked, power cord inspected..."
                className="mt-1 w-full text-xs p-2 rounded-lg border bg-background"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCustodyOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCustody}
                disabled={updatingCustody || (custodyAction === 'checkout' && !selectedContractorId)}
                className="text-xs font-semibold"
              >
                {updatingCustody ? 'Updating...' : 'Save Custody Record'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
