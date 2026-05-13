'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus, RefreshCw } from 'lucide-react';

interface InventoryRow {
  id: string;
  quantity_on_hand: number;
  is_low_stock: boolean;
  last_restocked_at: string | null;
  item: { name: string; sku: string | null; unit: string; reorder_threshold: number; cost_per_unit: number | null };
  zone: { name: string } | null;
}

export default function SupplyPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadInventory = () => {
    setLoading(true);
    fetch('/api/supply/inventory').then(r => r.json()).then((d) => { setInventory(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => { loadInventory(); }, []);

  const lowStockItems = inventory.filter(r => r.is_low_stock);

  async function handleRestock(itemId: string, zoneId: string | null, qty: number) {
    await fetch('/api/supply/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, zone_id: zoneId, quantity_ordered: qty }),
    });
    loadInventory();
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supply</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inventory levels, assignments, and restock orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadInventory} className="p-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Low-stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder threshold</p>
            <p className="text-xs text-amber-600 mt-0.5">{lowStockItems.map(r => r.item.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Inventory table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Inventory Levels</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading inventory…</div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No supply items configured. Add your first item above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Item</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Zone</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">On Hand</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Threshold</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Cost/Unit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-foreground">{row.item.name}</p>
                    {row.item.sku && <p className="text-xs text-muted-foreground">{row.item.sku}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{row.zone?.name ?? 'All zones'}</td>
                  <td className="px-4 py-3.5 text-right font-semibold">
                    <span className={row.is_low_stock ? 'text-red-600' : 'text-foreground'}>
                      {row.quantity_on_hand} {row.item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground">{row.item.reorder_threshold}</td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground">
                    {row.item.cost_per_unit != null ? `$${row.item.cost_per_unit.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {row.is_low_stock ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> Low stock
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {row.is_low_stock && (
                      <button
                        onClick={() => handleRestock(row.item.name, row.zone?.name ?? null, row.item.reorder_threshold * 2)}
                        className="text-xs text-primary hover:underline"
                      >
                        Reorder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
