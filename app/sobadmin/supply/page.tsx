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
  Layers,
  UserCheck,
  Edit3,
  Info,
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

// ============================================================================
// Types
// ============================================================================
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

const CONSUMABLE_CATEGORIES = [
  { id: 'all', label: 'All Consumables' },
  { id: 'chemical', label: 'Chemicals & Cleaners' },
  { id: 'consumable', label: 'Microfiber, Towels & Sponges' },
  { id: 'ppe', label: 'Gloves & Safety' },
  { id: 'paper', label: 'Bags & Paper' },
];

export default function SupplyPage() {
  // Main Data States
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentAsset[]>([]);
  const [demand, setDemand] = useState<DemandData | null>(null);
  const [contractors, setContractors] = useState<Array<{ id: string; full_name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Tab: 3 clean, practical sections
  const [activeTab, setActiveTab] = useState<'consumables' | 'equipment' | 'shopping'>('consumables');

  // Search & Filtering for Consumables
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok'>('all');

  // Inline Count Editing State
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [inlineQtyValue, setInlineQtyValue] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add Item Dialog (Consumables)
  const [addOpen, setAddOpen] = useState(false);
  const [submittingItem, setSubmittingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'chemical',
    unit: 'bottles',
    initial_quantity: '4',
    reorder_threshold: '2',
    cost_per_unit: '12.00',
    zone_id: 'all',
    home_depot_sku: '',
    amazon_asin: '',
    preferred_store: 'Home Depot',
    dilution_ratio: '',
    supplier_url: '',
  });

  // Add Equipment Dialog
  const [addEquipOpen, setAddEquipOpen] = useState(false);
  const [submittingEquip, setSubmittingEquip] = useState(false);
  const [newEquip, setNewEquip] = useState({
    name: '',
    model_number: '',
    serial_number: '',
    asset_tag: '',
    condition: 'good',
    notes: '',
  });

  // Restock / Count Adjustment Dialog
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restocking, setRestocking] = useState(false);

  // CSV Reconciler State (Home Depot / Amazon Receipts)
  const [csvRawText, setCsvRawText] = useState('');
  const [parsingCsv, setParsingCsv] = useState(false);
  const [reconcilePreview, setReconcilePreview] = useState<ParsedPurchasePreview | null>(null);
  const [reconcileTargetZone, setReconcileTargetZone] = useState<string>('all');
  const [committingReconcile, setCommittingReconcile] = useState(false);

  // Equipment Custody Dialog
  const [custodyOpen, setCustodyOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<EquipmentAsset | null>(null);
  const [custodyAction, setCustodyAction] = useState<'checkout' | 'checkin' | 'maintenance'>('checkout');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [reportedCondition, setReportedCondition] = useState<EquipmentAsset['condition']>('good');
  const [custodyNotes, setCustodyNotes] = useState('');
  const [updatingCustody, setUpdatingCustody] = useState(false);

  // Clipboard Feedback
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
      toast.error('Failed to load supply data');
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

    const category = (row.item?.category || '').toLowerCase();
    const isDurable = category === 'tool' || category === 'equipment';
    const threshold = row.item?.reorder_threshold ?? 2;

    setInventory((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              quantity_on_hand: newQty,
              is_low_stock: !isDurable && newQty <= threshold,
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

  // Set Exact Quantity (Direct Physical Count Audit)
  async function handleSetExactQuantity(row: InventoryRow, exactQty: number) {
    const newQty = Math.max(0, exactQty);
    if (newQty === row.quantity_on_hand) return;

    setUpdatingId(row.id);
    const category = (row.item?.category || '').toLowerCase();
    const isDurable = category === 'tool' || category === 'equipment';
    const threshold = row.item?.reorder_threshold ?? 2;

    setInventory((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              quantity_on_hand: newQty,
              is_low_stock: !isDurable && newQty <= threshold,
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/supply/inventory/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity_on_hand: newQty }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setInventory((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      toast.success(`Updated ${row.item?.name || 'item'} to ${newQty} ${row.item?.unit || 'units'} on hand`);
    } catch {
      toast.error('Failed to save stock quantity');
      loadAllData(true);
    } finally {
      setUpdatingId(null);
    }
  }

  // Filtered Consumables (Excludes Tools & Durable Equipment)
  const consumableRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inventory.filter((row) => {
      const item = row.item || {};
      const cat = (item.category || 'consumable').toLowerCase();
      // Strictly exclude tools and equipment from consumables!
      if (cat === 'tool' || cat === 'equipment') return false;

      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.home_depot_sku?.toLowerCase().includes(q) ||
        item.amazon_asin?.toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === 'all' ? true : cat === categoryFilter;

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'low'
          ? row.is_low_stock
          : !row.is_low_stock;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [inventory, search, categoryFilter, statusFilter]);

  // Durable Tools in Inventory (e.g. Dusters, Mop handles, Crevice brushes, Scrubber kits)
  const durableToolRows = useMemo(() => {
    return inventory.filter((row) => {
      const cat = (row.item?.category || '').toLowerCase();
      return cat === 'tool' || cat === 'equipment';
    });
  }, [inventory]);

  // Low stock consumables only
  const lowStockConsumables = useMemo(() => {
    return inventory.filter((r) => {
      const cat = (r.item?.category || '').toLowerCase();
      return cat !== 'tool' && cat !== 'equipment' && r.is_low_stock;
    });
  }, [inventory]);

  const totalUnits = inventory.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0);
  const totalValuation = inventory.reduce(
    (sum, r) => sum + (r.quantity_on_hand || 0) * (r.item?.cost_per_unit || 0),
    0
  );

  const totalShoppingItems =
    (demand?.homeDepotShoppingList?.length || 0) + (demand?.amazonShoppingList?.length || 0);

  // Handle Create Supply Consumable Item
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
      toast.success(`${newItem.name} added to supplies!`);
      setAddOpen(false);
      setNewItem({
        name: '',
        sku: '',
        category: 'chemical',
        unit: 'bottles',
        initial_quantity: '4',
        reorder_threshold: '2',
        cost_per_unit: '12.00',
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

  // Handle Create Equipment Asset
  async function handleCreateEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!newEquip.name.trim() || !newEquip.asset_tag.trim()) {
      toast.error('Asset name and Tag (e.g. EQ-VAC-02) are required');
      return;
    }
    setSubmittingEquip(true);
    try {
      const res = await fetch('/api/supply/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquip),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create equipment');
      }
      const createdAsset = await res.json();
      setEquipment((prev) => [createdAsset, ...prev]);
      toast.success(`${newEquip.name} registered in equipment fleet!`);
      setAddEquipOpen(false);
      setNewEquip({
        name: '',
        model_number: '',
        serial_number: '',
        asset_tag: '',
        condition: 'good',
        notes: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add equipment');
    } finally {
      setSubmittingEquip(false);
    }
  }

  // Handle Quick Restock Modal Confirm
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
      setActiveTab('consumables');
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
      `Date: ${new Date().toLocaleDateString()} | Sea of Blue Ops`,
      '',
      ...list.map(
        (item) =>
          `[ ] ${item.recommendedQty}x ${item.name} (${item.unit}) — SKU/ASIN: ${item.storeCode} (~$${item.totalCost})`
      ),
      '',
      `Estimated Total: $${list.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)} CAD`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedList(type);
    toast.success(`${type === 'hd' ? 'Home Depot' : 'Amazon'} checklist copied to clipboard!`);
    setTimeout(() => setCopiedList(null), 2500);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="h-6 w-6 text-primary" />
            Supply & Equipment Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track cleaning consumables, durable machinery, and generate ready-to-use Home Depot & Amazon shopping lists.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          {activeTab === 'consumables' && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Consumable
            </Button>
          )}

          {activeTab === 'equipment' && (
            <Button size="sm" onClick={() => setAddEquipOpen(true)} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Equipment
            </Button>
          )}
        </div>
      </div>

      {/* Practical Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Consumables Health */}
        <Card className={`shadow-sm ${lowStockConsumables.length > 0 ? 'border-amber-300 bg-amber-50/20' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Consumables Status
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockConsumables.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold tracking-tight ${lowStockConsumables.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {lowStockConsumables.length === 0 ? 'All Stocked' : `${lowStockConsumables.length} Low`}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  lowStockConsumables.length > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {lowStockConsumables.length > 0 ? 'Restock Needed' : 'Good'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chemicals, trash bags, towels, gloves</p>
          </CardContent>
        </Card>

        {/* Card 2: Machinery Fleet */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Durable Machinery Fleet
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {equipment.length} Units
              </span>
              <span className="text-xs text-muted-foreground">
                ({equipment.filter((e) => e.status === 'available').length} ready in hub)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Shop Vacs, Steam Cleaners, Action Cam</p>
          </CardContent>
        </Card>

        {/* Card 3: Shopping Run Budget */}
        <Card className="shadow-sm border-blue-100 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Next Store Run Est.
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${(demand?.estimatedTotalRestockBudget || 0).toFixed(2)} CAD
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalShoppingItems} low items on Home Depot & Amazon lists
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Inventory Valuation */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              On-Hand Inventory Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${totalValuation.toFixed(2)} CAD
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUnits} physical consumable units tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main 3 Practical Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <div className="bg-muted/40 p-1.5 rounded-xl border">
          <TabsList className="grid grid-cols-3 h-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="consumables"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2.5 font-semibold"
            >
              <Boxes className="h-4 w-4 mr-2 text-primary" />
              Consumables & Stock
              {lowStockConsumables.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 font-bold">
                  {lowStockConsumables.length} Low
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="equipment"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2.5 font-semibold"
            >
              <Wrench className="h-4 w-4 mr-2 text-blue-600" />
              Machinery & Durable Tools
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-700 font-semibold">
                {equipment.length + durableToolRows.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="shopping"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs py-2.5 font-semibold"
            >
              <ShoppingCart className="h-4 w-4 mr-2 text-indigo-600" />
              Shopping Checklist & Receipts
              {totalShoppingItems > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-700 font-bold">
                  {totalShoppingItems}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CONSUMABLES & EVERYDAY CLEANING SUPPLIES                           */}
        {/* ========================================================================= */}
        <TabsContent value="consumables" className="space-y-4 m-0">
          {/* Friendly Shelf Count Audit Alert */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-900 text-xs">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Direct Physical Shelf Count: </span>
              You don&apos;t need historical receipts for everything in your storage closet. Click on any quantity number below to type what you actually have on your shelves right now, or tap <strong>+</strong> / <strong>-</strong> to adjust.
            </div>
          </div>

          {/* Category Rail Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CONSUMABLE_CATEGORIES.map((cat) => (
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
                  placeholder="Search item name, Home Depot #, or ASIN..."
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
                  <SelectItem value="ok">Well Stocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground self-center">
              Showing {consumableRows.length} consumable items
            </div>
          </div>

          {/* Main Consumables Table */}
          <Card className="shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 text-xs">
                  <TableHead className="w-[320px]">Supply Item & Store Info</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center w-[160px]">On-Hand Count</TableHead>
                  <TableHead className="text-center w-[100px]">Alert Level</TableHead>
                  <TableHead className="text-center w-[110px]">Stock Status</TableHead>
                  <TableHead>Where to Buy</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading inventory counts...
                    </TableCell>
                  </TableRow>
                ) : consumableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                      No consumables found matching the search filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  consumableRows.map((row) => {
                    const isEditingThis = editingQtyId === row.id;

                    return (
                      <TableRow key={row.id} className="text-xs hover:bg-muted/20">
                        {/* Item Name & Codes */}
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">
                              {row.item?.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono text-[10px] text-muted-foreground">
                              {row.item?.home_depot_sku && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  HD #{row.item.home_depot_sku}
                                </span>
                              )}
                              {row.item?.amazon_asin && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  ASIN: {row.item.amazon_asin}
                                </span>
                              )}
                              {row.item?.sku && !row.item?.home_depot_sku && !row.item?.amazon_asin && (
                                <span>SKU: {row.item.sku}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {row.item?.category || 'consumable'}
                          </Badge>
                        </TableCell>

                        {/* On-Hand Quantity (Stepper + Click-to-Type) */}
                        <TableCell className="text-center">
                          {isEditingThis ? (
                            <div className="inline-flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineQtyValue}
                                onChange={(e) => setInlineQtyValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSetExactQuantity(row, parseInt(inlineQtyValue, 10) || 0);
                                    setEditingQtyId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingQtyId(null);
                                  }
                                }}
                                onBlur={() => {
                                  handleSetExactQuantity(row, parseInt(inlineQtyValue, 10) || 0);
                                  setEditingQtyId(null);
                                }}
                                className="w-16 h-8 text-center text-xs font-bold border-primary shadow-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                                onClick={() => {
                                  handleSetExactQuantity(row, parseInt(inlineQtyValue, 10) || 0);
                                  setEditingQtyId(null);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center border rounded-lg overflow-hidden bg-background shadow-xs">
                              <button
                                onClick={() => handleQuickAdjust(row, -1)}
                                disabled={updatingId === row.id || row.quantity_on_hand <= 0}
                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                                title="Subtract 1"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQtyId(row.id);
                                  setInlineQtyValue(row.quantity_on_hand.toString());
                                }}
                                className={`px-3 py-1 text-xs font-bold min-w-[2.75rem] text-center hover:bg-muted/60 transition-colors cursor-pointer group flex items-center justify-center gap-1 ${
                                  row.is_low_stock ? 'text-amber-700 bg-amber-50/50' : 'text-foreground'
                                }`}
                                title="Click to type exact physical count"
                              >
                                <span>{row.quantity_on_hand}</span>
                                <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-70 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(row, +1)}
                                disabled={updatingId === row.id}
                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Add 1"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {row.item?.unit || 'units'}
                          </div>
                        </TableCell>

                        {/* Min Reorder Threshold */}
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {row.item?.reorder_threshold ?? 2}
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          {row.is_low_stock ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold hover:bg-amber-100">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              In Stock
                            </Badge>
                          )}
                        </TableCell>

                        {/* Preferred Store & Link */}
                        <TableCell>
                          {row.item?.home_depot_sku ? (
                            <a
                              href={`https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(row.item.home_depot_sku)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium hover:underline text-[11px]"
                            >
                              Home Depot
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : row.item?.amazon_asin ? (
                            <a
                              href={`https://www.amazon.ca/dp/${row.item.amazon_asin}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline text-[11px]"
                            >
                              Amazon
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              {row.item?.preferred_store || 'Standard Supply'}
                            </span>
                          )}
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setSelectedRow(row);
                              setRestockQty(5);
                              setRestockOpen(true);
                            }}
                          >
                            + Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: MACHINERY & DURABLE TOOLS (NEVER ALERTS AS LOW STOCK)             */}
        {/* ========================================================================= */}
        <TabsContent value="equipment" className="space-y-6 m-0">
          {/* Section 1: Fleet Machinery */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Fleet Machinery & Serialized Assets
                </h3>
                <p className="text-xs text-muted-foreground">
                  Shop vacuums, handheld steam cleaners, and video inspection gear. These items do not deplete per job.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddEquipOpen(true)}
                className="h-8 text-xs self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Register New Machine
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map((asset) => {
                const isCheckedOut = asset.status === 'checked_out';
                const isMaint = asset.status === 'in_maintenance';

                return (
                  <Card
                    key={asset.id}
                    className={`shadow-sm border transition-all ${
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
                              <span className="italic text-muted-foreground">In Depot (Available)</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Condition:</span>
                          <Badge variant="secondary" className="capitalize text-[10px] font-normal">
                            {asset.condition.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {asset.notes && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                          &quot;{asset.notes}&quot;
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
                            Assign to Cleaner
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section 2: Durable Cleaning Kits & Tools (Dusters, Scrubbers, Mop Handles) */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Durable Cleaning Tools & Kits
              </h3>
              <p className="text-xs text-muted-foreground">
                Long-lasting equipment kits (dusters, drill scrubbers, mop frames) that only require 1 or 2 units per crew and never trigger consumable low-stock alerts.
              </p>
            </div>

            <Card className="shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-xs">
                    <TableHead>Tool / Kit Name</TableHead>
                    <TableHead>Kit Unit</TableHead>
                    <TableHead className="text-center w-[160px]">Units Owned</TableHead>
                    <TableHead>Tool Policy</TableHead>
                    <TableHead>Store Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {durableToolRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        No durable tools registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    durableToolRows.map((row) => (
                      <TableRow key={row.id} className="text-xs">
                        <TableCell>
                          <p className="font-semibold text-foreground text-sm">
                            {row.item?.name}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {row.item?.sku || 'DURABLE-KIT'}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {row.item?.unit || 'kit'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="inline-flex items-center border rounded-lg overflow-hidden bg-background shadow-xs">
                            <button
                              onClick={() => handleQuickAdjust(row, -1)}
                              disabled={updatingId === row.id || row.quantity_on_hand <= 0}
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-3 py-1 text-xs font-bold min-w-[2.5rem] text-center text-foreground">
                              {row.quantity_on_hand}
                            </span>
                            <button
                              onClick={() => handleQuickAdjust(row, +1)}
                              disabled={updatingId === row.id}
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Durable Asset (No Auto-Burn)
                          </span>
                        </TableCell>

                        <TableCell>
                          {row.item?.amazon_asin ? (
                            <a
                              href={`https://www.amazon.ca/dp/${row.item.amazon_asin}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline text-[11px]"
                            >
                              Amazon
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : row.item?.home_depot_sku ? (
                            <a
                              href={`https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(row.item.home_depot_sku)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium hover:underline text-[11px]"
                            >
                              Home Depot
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Commercial Janitorial</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: SHOPPING CHECKLIST & RECEIPTS                                      */}
        {/* ========================================================================= */}
        <TabsContent value="shopping" className="space-y-6 m-0">
          {/* Top Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Actionable Restock Checklist
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically prepared from consumables that are genuinely low. Ready to copy to text message or bring to the store.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShoppingListToClipboard('hd')}
                disabled={!demand || demand.homeDepotShoppingList.length === 0}
                className="h-8 text-xs border-orange-300 text-orange-800 hover:bg-orange-50 font-semibold"
              >
                {copiedList === 'hd' ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1 text-orange-600" />
                    Copy Home Depot List
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShoppingListToClipboard('amz')}
                disabled={!demand || demand.amazonShoppingList.length === 0}
                className="h-8 text-xs border-blue-300 text-blue-800 hover:bg-blue-50 font-semibold"
              >
                {copiedList === 'amz' ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Copy Amazon List
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 2 Store Columns: Home Depot and Amazon */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: The Home Depot */}
            <Card className="shadow-sm border-orange-200">
              <CardHeader className="bg-orange-50/40 border-b border-orange-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      HD
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        The Home Depot Run
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Cleaning chemicals, sprayers & contractor trash bags
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                    {demand?.homeDepotShoppingList.length || 0} items needed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {!demand || demand.homeDepotShoppingList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-foreground">All Home Depot supplies are well-stocked!</p>
                    <p className="mt-0.5">No urgent items needed right now.</p>
                  </div>
                ) : (
                  demand.homeDepotShoppingList.map((item) => (
                    <div
                      key={item.itemId}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground text-sm leading-tight">
                          {item.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          Home Depot SKU: {item.storeCode}
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1">
                          {item.reason}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm px-2 py-0.5 rounded bg-orange-100 text-orange-900">
                          Buy {item.recommendedQty} {item.unit}
                        </span>
                        <div className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                          ~${item.totalCost.toFixed(2)} CAD
                        </div>
                        {item.storeUrl && (
                          <a
                            href={item.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:underline mt-1 text-[11px]"
                          >
                            Find at HD <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Column 2: Amazon Order */}
            <Card className="shadow-sm border-blue-200">
              <CardHeader className="bg-blue-50/40 border-b border-blue-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
                      a
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Amazon Restock Order
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Bulk microfiber packs, nitrile gloves & PPE
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                    {demand?.amazonShoppingList.length || 0} items needed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {!demand || demand.amazonShoppingList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-foreground">All Amazon supplies are well-stocked!</p>
                    <p className="mt-0.5">No urgent items needed right now.</p>
                  </div>
                ) : (
                  demand.amazonShoppingList.map((item) => (
                    <div
                      key={item.itemId}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground text-sm leading-tight">
                          {item.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          ASIN: {item.storeCode}
                        </p>
                        <p className="text-[11px] text-blue-700 mt-1">
                          {item.reason}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                          Order {item.recommendedQty} {item.unit}
                        </span>
                        <div className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                          ~${item.totalCost.toFixed(2)} CAD
                        </div>
                        {item.storeUrl && (
                          <a
                            href={item.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline mt-1 text-[11px]"
                          >
                            Open on Amazon <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Optional Receipt & CSV Purchase Ingestion */}
          <Card className="shadow-sm border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Optional: Upload Receipts / Order Exports
              </CardTitle>
              <CardDescription className="text-xs">
                Have a Home Depot Pro Xtra or Amazon purchase export? Upload the CSV or paste lines below to auto-increment your inventory stock. (Remember: you can also set counts directly in the Consumables tab!)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <label className="cursor-pointer border-2 border-dashed rounded-xl p-4 text-center hover:bg-muted/40 transition-colors flex-1">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleParseCSV}
                  />
                  <FileText className="h-6 w-6 text-primary mx-auto mb-1 opacity-70" />
                  <span className="font-semibold text-foreground">Choose CSV Receipt Export</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Supports Home Depot Pro Xtra & Amazon order CSVs</p>
                </label>

                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    rows={3}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder="Or paste CSV text lines here: SKU, Description, Qty, Price..."
                    className="w-full text-xs font-mono p-2 rounded-lg border bg-background resize-none h-full"
                  />
                  <Button
                    onClick={() => handleParseCSV()}
                    disabled={parsingCsv || !csvRawText.trim()}
                    className="h-8 text-xs self-end"
                  >
                    {parsingCsv ? 'Parsing...' : 'Parse Receipt Text'}
                  </Button>
                </div>
              </div>

              {/* Parsed Preview Table */}
              {reconcilePreview && (
                <div className="border rounded-xl p-4 bg-muted/20 space-y-4 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white text-xs">
                          {reconcilePreview.vendorName}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          Order #{reconcilePreview.orderReference}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Found {reconcilePreview.items.length} items totaling ${reconcilePreview.totalAmount.toFixed(2)} CAD
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                        <TableHead>SKU / ASIN</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconcilePreview.items.map((item, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-mono">{item.rawIdentifier}</TableCell>
                          <TableCell className="font-medium">{item.rawDescription}</TableCell>
                          <TableCell className="text-center font-bold">+{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono">${item.totalPrice.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG: ADD SUPPLY CONSUMABLE ITEM                                        */}
      {/* ========================================================================= */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Consumable Supply</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new cleaning chemical, trash bag, towel, or PPE item into your inventory.
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
                    <SelectItem value="chemical">Chemicals & Cleaners</SelectItem>
                    <SelectItem value="consumable">Microfiber, Towels & Sponges</SelectItem>
                    <SelectItem value="ppe">Gloves & Safety</SelectItem>
                    <SelectItem value="paper">Bags & Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="item-unit">Unit of Measure</Label>
                <Input
                  id="item-unit"
                  placeholder="e.g. bottles, packs, boxes"
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
                <Label htmlFor="initial-stock">Initial Count</Label>
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
                <Label htmlFor="min-reorder">Low Alert Min</Label>
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingItem} className="text-xs">
                {submittingItem ? 'Saving...' : 'Add Consumable'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: ADD MACHINERY / EQUIPMENT ASSET                                   */}
      {/* ========================================================================= */}
      <Dialog open={addEquipOpen} onOpenChange={setAddEquipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Equipment Machine</DialogTitle>
            <DialogDescription className="text-xs">
              Register durable gear like shop vacs, steam cleaners, or cameras into your fleet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEquipment} className="space-y-3.5 pt-2 text-xs">
            <div>
              <Label htmlFor="equip-name">Machine / Equipment Name *</Label>
              <Input
                id="equip-name"
                placeholder="e.g. RIDGID 6-Gallon Wet/Dry Shop Vac"
                value={newEquip.name}
                onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="equip-tag">Asset Tag (Identifier) *</Label>
                <Input
                  id="equip-tag"
                  placeholder="e.g. EQ-VAC-02"
                  value={newEquip.asset_tag}
                  onChange={(e) => setNewEquip({ ...newEquip, asset_tag: e.target.value })}
                  required
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <Label htmlFor="equip-condition">Initial Condition</Label>
                <Select
                  value={newEquip.condition}
                  onValueChange={(val) => setNewEquip({ ...newEquip, condition: val })}
                >
                  <SelectTrigger id="equip-condition" className="mt-1 text-xs capitalize">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pristine">Pristine (Brand New)</SelectItem>
                    <SelectItem value="good">Good (Ready for Field)</SelectItem>
                    <SelectItem value="worn">Worn (Usable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="equip-model">Model Number (Optional)</Label>
                <Input
                  id="equip-model"
                  placeholder="e.g. HD0600"
                  value={newEquip.model_number}
                  onChange={(e) => setNewEquip({ ...newEquip, model_number: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="equip-serial">Serial Number (Optional)</Label>
                <Input
                  id="equip-serial"
                  placeholder="e.g. SN-2026-99"
                  value={newEquip.serial_number}
                  onChange={(e) => setNewEquip({ ...newEquip, serial_number: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="equip-notes">Purchase Notes / Custody Location</Label>
              <textarea
                id="equip-notes"
                rows={2}
                value={newEquip.notes}
                onChange={(e) => setNewEquip({ ...newEquip, notes: e.target.value })}
                placeholder="e.g. Purchased at Home Depot, kept in primary van..."
                className="mt-1 w-full text-xs p-2 rounded-lg border bg-background"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddEquipOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingEquip} className="text-xs">
                {submittingEquip ? 'Saving...' : 'Register Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: QUICK RESTOCK PRESET                                              */}
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
                {[2, 5, 10, 20].map((preset) => (
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
              {custodyAction === 'checkout' ? 'Assign Equipment to Cleaner' : 'Return & Inspect Equipment'}
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
                    <SelectItem value="maintenance_needed">Maintenance Needed</SelectItem>
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
                placeholder="e.g. Hose inspected, filter clean..."
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
