'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ArrowUpDown,
  Boxes,
  DollarSign,
  TrendingDown,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorder_threshold: number;
  cost_per_unit: number | null;
  supplier_url?: string | null;
}

interface InventoryRow {
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

interface ZoneOption {
  id: string;
  name: string;
}

const UNIT_OPTIONS = [
  'bottles',
  'gallons',
  'packs',
  'boxes',
  'rolls',
  'units',
  'sets',
  'tubs',
];

export default function SupplyPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // Add Item Dialog State
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    unit: 'bottles',
    initial_quantity: '20',
    reorder_threshold: '10',
    cost_per_unit: '8.50',
    zone_id: 'all',
    supplier_url: '',
  });

  // Restock Dialog State
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restocking, setRestocking] = useState(false);

  // Adjusting stock row id
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadInventory(isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [invRes, zonesRes] = await Promise.all([
        fetch('/api/supply/inventory'),
        fetch('/api/zones'),
      ]);

      const invData = await invRes.json();
      const zonesData = await zonesRes.json();

      setInventory(Array.isArray(invData) ? invData : []);
      setZones(Array.isArray(zonesData) ? zonesData : []);
    } catch (err) {
      console.error('Failed to load supply inventory:', err);
      toast.error('Failed to load supply data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered rows
  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inventory.filter((row) => {
      const matchSearch =
        !q ||
        row.item?.name?.toLowerCase().includes(q) ||
        row.item?.sku?.toLowerCase().includes(q) ||
        row.zone?.name?.toLowerCase().includes(q);

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

      return matchSearch && matchStatus && matchZone;
    });
  }, [inventory, search, statusFilter, zoneFilter]);

  // Summary Metrics
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0);
  const lowStockRows = inventory.filter((r) => r.is_low_stock);
  const totalValue = inventory.reduce(
    (sum, r) => sum + (r.quantity_on_hand || 0) * (r.item?.cost_per_unit || 0),
    0
  );

  // Quick delta adjustment (+1 / -1)
  async function handleQuickAdjust(row: InventoryRow, delta: number) {
    const newQty = Math.max(0, row.quantity_on_hand + delta);
    setUpdatingId(row.id);

    // Optimistic update
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
      loadInventory();
    } finally {
      setUpdatingId(null);
    }
  }

  // Create Supply Item
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/supply/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add supply item');
      }

      const createdRow = await res.json();
      setInventory((prev) => [createdRow, ...prev]);
      toast.success(`${newItem.name} added to inventory!`);
      setAddOpen(false);
      setNewItem({
        name: '',
        sku: '',
        unit: 'bottles',
        initial_quantity: '20',
        reorder_threshold: '10',
        cost_per_unit: '8.50',
        zone_id: 'all',
        supplier_url: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  // Restock Order / Direct Add
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
          auto_receive: true, // directly adds to inventory on hand
        }),
      });

      if (!res.ok) throw new Error('Restock failed');

      toast.success(`Restocked +${restockQty} ${selectedRow.item.unit} of ${selectedRow.item.name}!`);
      setRestockOpen(false);
      await loadInventory(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process restock');
    } finally {
      setRestocking(false);
    }
  }

  // Delete Item
  async function handleDeleteItem(row: InventoryRow) {
    if (!confirm(`Are you sure you want to remove ${row.item.name} from inventory?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/supply/inventory/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      toast.success(`${row.item.name} removed from inventory`);
      setInventory((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      toast.error('Failed to remove item');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supply & Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time stock tracking, replenishment, and zone allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInventory(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supply Item
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Supply Items
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Managed product lines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Units In Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all service hubs</p>
          </CardContent>
        </Card>

        <Card className={lowStockRows.length > 0 ? 'border-amber-300 bg-amber-50/40' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <TrendingDown
              className={`h-4 w-4 ${lowStockRows.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${lowStockRows.length > 0 ? 'text-amber-700' : ''}`}>
                {lowStockRows.length}
              </span>
              {lowStockRows.length > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  Action Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Below minimum reorder threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estimated Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Current on-hand inventory CAD</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-900">
                {lowStockRows.length} item{lowStockRows.length > 1 ? 's' : ''} require restocking
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 text-amber-800 bg-amber-100/50 hover:bg-amber-100"
                onClick={() => setStatusFilter('low')}
              >
                View Low Stock Only
              </Button>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              {lowStockRows.map((r) => `${r.item?.name} (${r.quantity_on_hand}/${r.item?.reorder_threshold})`).join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search supply items, SKU, or zones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock Only</SelectItem>
              <SelectItem value="ok">Adequate Stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="unassigned">General / All Zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground self-center">
          Showing {filteredInventory.length} of {inventory.length} item{inventory.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Item & SKU</TableHead>
                <TableHead>Zone / Location</TableHead>
                <TableHead className="text-center">Stock On Hand</TableHead>
                <TableHead className="text-right">Reorder Threshold</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading inventory levels...
                  </TableCell>
                </TableRow>
              ) : filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No supply items found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search || statusFilter !== 'all' || zoneFilter !== 'all'
                        ? 'Try clearing search filters'
                        : 'Click "Add Supply Item" above to add your first product'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((row) => {
                  const itemValue =
                    (row.quantity_on_hand || 0) * (row.item?.cost_per_unit || 0);

                  return (
                    <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {row.item?.name}
                          {row.item?.supplier_url && (
                            <a
                              href={row.item.supplier_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-primary"
                              title="Supplier Website"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {row.item?.sku && (
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {row.item.sku}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            {row.item?.unit}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {row.zone?.name ? (
                          <Badge variant="outline" className="font-normal text-xs">
                            {row.zone.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic">All Zones (Hub)</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex items-center border rounded-lg overflow-hidden bg-background">
                          <button
                            onClick={() => handleQuickAdjust(row, -1)}
                            disabled={updatingId === row.id || row.quantity_on_hand <= 0}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                            title="Decrease quantity by 1"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={`px-3 text-sm font-bold min-w-[3rem] text-center ${
                              row.is_low_stock ? 'text-amber-700' : 'text-foreground'
                            }`}
                          >
                            {row.quantity_on_hand}
                          </span>
                          <button
                            onClick={() => handleQuickAdjust(row, +1)}
                            disabled={updatingId === row.id}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Increase quantity by 1"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {row.item?.reorder_threshold ?? '—'}
                      </TableCell>

                      <TableCell className="text-right text-xs font-mono">
                        {row.item?.cost_per_unit != null
                          ? `$${row.item.cost_per_unit.toFixed(2)}`
                          : '—'}
                      </TableCell>

                      <TableCell className="text-right text-xs font-mono font-medium">
                        ${itemValue.toFixed(2)}
                      </TableCell>

                      <TableCell>
                        {row.is_low_stock ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]"
                          >
                            In Stock
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-6 space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => {
                            setSelectedRow(row);
                            setRestockQty(row.item?.reorder_threshold ? row.item.reorder_threshold * 2 : 20);
                            setRestockOpen(true);
                          }}
                        >
                          Restock
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteItem(row)}
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add Supply Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supply Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Microfiber Towels 24-Pack"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sku">SKU / Code</Label>
                <Input
                  id="sku"
                  placeholder="e.g. MF-24PK"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit of Measure</Label>
                <Select
                  value={newItem.unit}
                  onValueChange={(val) => setNewItem({ ...newItem, unit: val })}
                >
                  <SelectTrigger id="unit" className="mt-1 capitalize">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u} className="capitalize">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="initial-qty">Initial Stock</Label>
                <Input
                  id="initial-qty"
                  type="number"
                  min="0"
                  value={newItem.initial_quantity}
                  onChange={(e) => setNewItem({ ...newItem, initial_quantity: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reorder-threshold">Reorder Alert</Label>
                <Input
                  id="reorder-threshold"
                  type="number"
                  min="1"
                  value={newItem.reorder_threshold}
                  onChange={(e) => setNewItem({ ...newItem, reorder_threshold: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cost">Cost / Unit ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.cost_per_unit}
                  onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zone">Target Zone / Location</Label>
              <Select
                value={newItem.zone_id}
                onValueChange={(val) => setNewItem({ ...newItem, zone_id: val })}
              >
                <SelectTrigger id="zone" className="mt-1">
                  <SelectValue placeholder="All Zones (General Hub)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones (Central Inventory)</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier_url">Supplier Website URL (Optional)</Label>
              <Input
                id="supplier_url"
                type="url"
                placeholder="https://supplier.com/product"
                value={newItem.supplier_url}
                onChange={(e) => setNewItem({ ...newItem, supplier_url: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Restock Dialog */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-semibold text-sm">{selectedRow?.item?.name}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Current on hand: {selectedRow?.quantity_on_hand} {selectedRow?.item?.unit}</span>
                <span>Threshold: {selectedRow?.item?.reorder_threshold}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Quick Presets</Label>
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
              <Label htmlFor="custom-qty">Units to Add</Label>
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
              <Button type="button" variant="outline" onClick={() => setRestockOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRestock}
                disabled={restocking || restockQty <= 0}
              >
                {restocking ? 'Restocking...' : `Add +${restockQty} Units`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
