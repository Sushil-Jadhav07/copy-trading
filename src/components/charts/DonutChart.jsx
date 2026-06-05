import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const DonutChart = ({
  data,
  nameKey = 'name',
  valueKey = 'value',
  colors = ['#00C896', '#00A878', '#059669', '#F59E0B', '#EF4444', '#10B981'],
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  showLegend = true,
  tooltipFormatter = (val) => `₹${val.toLocaleString('en-IN')}`,
  centerContent,
}) => {
  const { isDark } = useTheme();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium" style={{ color: item.color }}>{item.name}</p>
          <p className="text-lg font-semibold text-foreground">{tooltipFormatter(item.value)}</p>
          <p className="text-xs text-muted-foreground">
            {item.payload.total > 0 ? ((item.value / item.payload.total) * 100).toFixed(1) : '0.0'}%
          </p>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, item) => sum + item[valueKey], 0);
  const dataWithTotal = data.map((item) => ({ ...item, total }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey={valueKey}
          nameKey={nameKey}
        >
          {dataWithTotal.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)'}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChart;
