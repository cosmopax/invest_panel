"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useAddHolding } from "@/hooks/use-portfolio";
import { toast } from "sonner";

export function AddHoldingDialog() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<"stock" | "crypto" | "metal">(
    "stock",
  );
  const [currency, setCurrency] = useState("USD");
  const [quantity, setQuantity] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [costBasisEur, setCostBasisEur] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");

  const addHolding = useAddHolding();

  function resetForm() {
    setSymbol("");
    setName("");
    setAssetClass("stock");
    setCurrency("USD");
    setQuantity("");
    setCostBasis("");
    setCostBasisEur("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await addHolding.mutateAsync({
        symbol: symbol.toUpperCase(),
        name,
        assetClass,
        currency,
        quantity: parseFloat(quantity),
        costBasisPerUnit: parseFloat(costBasis),
        costBasisEur: parseFloat(costBasisEur),
        purchaseDate,
        notes: notes || undefined,
      });

      toast.success(`Added ${symbol.toUpperCase()} to portfolio`);
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add holding",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL, BTC, XAU"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Apple Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Asset Class</Label>
              <Select
                value={assetClass}
                onValueChange={(v) => {
                  setAssetClass(v as "stock" | "crypto" | "metal");
                  if (v === "crypto" || v === "metal") setCurrency("EUR");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost/Unit</Label>
              <Input
                id="cost"
                type="number"
                step="any"
                placeholder="150.00"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costEur">Cost/Unit (EUR)</Label>
              <Input
                id="costEur"
                type="number"
                step="any"
                placeholder="138.50"
                value={costBasisEur}
                onChange={(e) => setCostBasisEur(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Purchase Date</Label>
            <Input
              id="date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Bought on earnings dip..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addHolding.isPending}>
              {addHolding.isPending ? "Adding..." : "Add Holding"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
