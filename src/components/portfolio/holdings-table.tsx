"use client";

import { cn } from "@/lib/utils";
import type { HoldingData } from "@/hooks/use-portfolio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(qty: number, assetClass: string): string {
  if (assetClass === "crypto") return qty.toFixed(6);
  if (assetClass === "metal") return `${qty.toFixed(2)}g`;
  return qty.toFixed(2);
}

const CLASS_COLORS: Record<string, string> = {
  stock: "bg-blue-500/20 text-blue-400",
  crypto: "bg-purple-500/20 text-purple-400",
  metal: "bg-amber-500/20 text-amber-400",
};

interface HoldingsTableProps {
  holdings: HoldingData[];
  totalValue: number;
}

export function HoldingsTable({ holdings, totalValue }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
        No holdings yet. Add your first position to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead>Asset</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Cost (EUR)</TableHead>
            <TableHead className="text-right">Market Value (EUR)</TableHead>
            <TableHead className="text-right">P&L (EUR)</TableHead>
            <TableHead className="text-right">Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const marketValue = h.costBasisEur * h.quantity; // Placeholder until live prices
            const pnl = 0; // Needs live prices
            const pnlPercent = 0;
            const weight =
              totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

            return (
              <TableRow key={h.id} className="border-border">
                <TableCell>
                  <div>
                    <span className="font-medium text-foreground">
                      {h.asset.symbol}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {h.asset.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      CLASS_COLORS[h.asset.assetClass],
                    )}
                  >
                    {h.asset.assetClass}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(h.quantity, h.asset.assetClass)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatEur(h.costBasisEur)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatEur(marketValue)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    pnl > 0 && "text-gain",
                    pnl < 0 && "text-loss",
                  )}
                >
                  {pnl > 0 ? "+" : ""}
                  {formatEur(pnl)} ({pnlPercent > 0 ? "+" : ""}
                  {pnlPercent.toFixed(1)}%)
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {weight.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
