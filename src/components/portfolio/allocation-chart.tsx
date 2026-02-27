"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { HoldingData } from "@/hooks/use-portfolio";

const COLORS: Record<string, string> = {
  stock: "#3b82f6",
  crypto: "#8b5cf6",
  metal: "#f59e0b",
};

interface AllocationChartProps {
  holdings: HoldingData[];
}

export function AllocationChart({ holdings }: AllocationChartProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data to display
      </div>
    );
  }

  // Group by asset class
  const byClass = holdings.reduce<Record<string, number>>((acc, h) => {
    const cls = h.asset.assetClass;
    acc[cls] = (acc[cls] || 0) + h.costBasisEur * h.quantity;
    return acc;
  }, {});

  const data = Object.entries(byClass).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    key: name,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={COLORS[entry.key] || "#6b7280"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              color: "#f9fafb",
              fontSize: "12px",
            }}
            formatter={(value) =>
              new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(value as number)
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex justify-center gap-4">
        {data.map((entry) => (
          <div key={entry.key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[entry.key] }}
            />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
