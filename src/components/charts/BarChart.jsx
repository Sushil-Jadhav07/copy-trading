import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const BarChart = ({
  data,
  xKey = 'month',
  yKey = 'value',
  yKeys,
  colors = ['#00C896', '#EF4444', '#00A878', '#F59E0B'],
  height = 300,
  stacked = false,
  yAxisFormatter = (val) => `₹${(val / 1000).toFixed(0)}K`,
  tooltipFormatter = (val) => `₹${val.toLocaleString('en-IN')}`,
  showLegend = false,
}) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const axisColor = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.35)';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {tooltipFormatter(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={xKey} stroke={axisColor} fontSize={12} tickLine={false} />
        <YAxis stroke={axisColor} fontSize={12} tickLine={false} tickFormatter={yAxisFormatter} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        {yKeys ? (
          yKeys.map((key, idx) => (
            <Bar key={key} dataKey={key} name={key} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} stackId={stacked ? 'stack' : undefined} />
          ))
        ) : (
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry[yKey] >= 0 ? colors[0] : colors[1]} />
            ))}
          </Bar>
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
