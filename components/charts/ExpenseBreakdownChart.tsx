'use client';

import React from 'react';
import { formatPHP } from '@/lib/utils/formatters';
import HighchartsWrapper from './HighchartsWrapper';

interface ExpenseBreakdownChartProps {
  data: Array<{
    categoryName: string;
    categoryCode: string;
    amount: number;
  }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

export default function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const chartData = data
    .filter((d) => d.amount > 0)
    .map((d, idx) => ({
      name: d.categoryName,
      y: d.amount,
      color: COLORS[idx % COLORS.length],
    }));

  const options: any = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      spacingTop: 10,
      spacingRight: 10,
      spacingBottom: 10,
      spacingLeft: 10,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    tooltip: {
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      style: {
        fontSize: '12px',
      },
      formatter: function (this: any) {
        return `<div style="padding: 4px 6px;">
          <strong style="color: ${this.point.color}; font-size: 12px;">● ${this.point.name}</strong>
          <div style="color: #0f172a; font-weight: 700; font-family: monospace; margin-top: 4px;">
            ${formatPHP(Number(this.y))} (${this.percentage?.toFixed(1)}%)
          </div>
        </div>`;
      },
    },
    plotOptions: {
      pie: {
        innerSize: '60%',
        allowPointSelect: true,
        cursor: 'pointer',
        borderWidth: 2,
        borderColor: '#ffffff',
        dataLabels: {
          enabled: false,
        },
        showInLegend: true,
        animation: {
          duration: 1000,
        },
        states: {
          hover: {
            brightness: 0.1,
            halo: {
              size: 8,
              opacity: 0.25,
            },
          },
        },
      },
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      layout: 'horizontal',
      itemStyle: {
        color: '#475569',
        fontSize: '11px',
        fontWeight: '600',
      },
      itemHoverStyle: {
        color: '#0f172a',
      },
    },
    series: [
      {
        name: 'Expenditure',
        type: 'pie',
        data: chartData,
      },
    ],
  };

  return (
    <div className="w-full h-72">
      {chartData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">
          No category expenditure recorded yet.
        </div>
      ) : (
        <HighchartsWrapper options={options} />
      )}
    </div>
  );
}
