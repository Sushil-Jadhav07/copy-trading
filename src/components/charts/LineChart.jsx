import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import { formatCompactINR } from '@/lib/utils';

const LineChart = ({
  data,
  xKey = 'time',
  yKey = 'value',
  showArea = true,
  gradient = ['#00C896', '#00A878'],
  height = 300,
  yAxisFormatter = formatCompactINR,
  tooltipFormatter = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
}) => {
  const { isDark } = useTheme();
  const isFlat = data.length === 0 || data.every((item) => Number(item?.[yKey] ?? 0) === 0);

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">
            {tooltipFormatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isFlat) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-xs font-medium text-muted-foreground">No P&amp;L yet</p>
        <div className="mt-2 w-full border-t border-dashed border-border/40" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {showArea ? (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradient[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={gradient[1]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xKey} stroke={axisColor} fontSize={12} tickLine={false} />
          <YAxis stroke={axisColor} fontSize={12} tickLine={false} tickFormatter={yAxisFormatter} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={yKey} stroke={gradient[0]} strokeWidth={2} fill={`url(#gradient-${yKey})`} />
        </AreaChart>
      ) : (
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xKey} stroke={axisColor} fontSize={12} tickLine={false} />
          <YAxis stroke={axisColor} fontSize={12} tickLine={false} tickFormatter={yAxisFormatter} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey={yKey} stroke={gradient[0]} strokeWidth={2} dot={false} />
        </RechartsLineChart>
      )}
    </ResponsiveContainer>
  );
};

export default LineChart;
