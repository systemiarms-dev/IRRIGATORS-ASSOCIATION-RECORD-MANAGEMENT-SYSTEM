'use client';

import React from 'react';
import { formatPHP } from '@/lib/utils/formatters';
import HighchartsWrapper from './HighchartsWrapper';

interface FinancialTrendsChartProps {
  data: Array<{
    month: string;
    collections: number;
    expenses: number;
  }>;
}

export default function FinancialTrendsChart({ data }: FinancialTrendsChartProps) {
  const categories = data.map((d) => d.month);
  const collectionsData = data.map((d) => d.collections);
  const expensesData = data.map((d) => d.expenses);

  const options: any = {
    chart: {
      type: 'areaspline',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'Public Sans, system-ui, sans-serif',
      },
      spacingTop: 15,
      spacingRight: 15,
      spacingBottom: 15,
      spacingLeft: 10,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: categories,
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
      labels: {
        style: {
          color: '#64748b',
          fontSize: '12px',
          fontWeight: '600',
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineColor: '#f1f5f9',
      gridLineDashStyle: 'Dash',
      labels: {
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: '500',
        },
        formatter: function (this: any) {
          return `₱${Number(this.value) / 1000}k`;
        },
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      style: {
        fontSize: '12px',
      },
      formatter: function (this: any) {
        let s = `<div style="padding: 4px 6px;"><b style="color: #1e293b; font-size: 13px;">${this.x}</b><div style="margin-top: 6px;">`;
        this.points?.forEach((point: any) => {
          s += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="color: ${point.color}; font-weight: 600;">● ${point.series.name}:</span>
            <strong style="color: #0f172a; font-family: monospace;">${formatPHP(Number(point.y))}</strong>
          </div>`;
        });
        s += '</div></div>';
        return s;
      },
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 0.25,
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
          states: {
            hover: {
              enabled: true,
              radius: 7,
              lineWidth: 2,
              strokeColor: '#ffffff',
            },
          },
        },
        states: {
          hover: {
            lineWidth: 4,
          },
        },
        animation: {
          duration: 1200,
        },
      },
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: {
        color: '#475569',
        fontSize: '12px',
        fontWeight: '600',
      },
      itemHoverStyle: {
        color: '#0f172a',
      },
    },
    series: [
      {
        name: 'ISF Collections (₱)',
        type: 'areaspline',
        data: collectionsData,
        color: '#10b981',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(16, 185, 129, 0.45)'],
            [1, 'rgba(16, 185, 129, 0.02)'],
          ],
        },
      },
      {
        name: 'Disbursements & Expenses (₱)',
        type: 'areaspline',
        data: expensesData,
        color: '#f43f5e',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(244, 63, 94, 0.40)'],
            [1, 'rgba(244, 63, 94, 0.02)'],
          ],
        },
      },
    ],
  };

  return (
    <div className="w-full h-72">
      <HighchartsWrapper options={options} />
    </div>
  );
}
