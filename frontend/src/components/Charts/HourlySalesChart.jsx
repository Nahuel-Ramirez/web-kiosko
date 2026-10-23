import { useApp } from '../../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function HourlySalesChart({ data }) {
  const { formatMoney } = useApp();

  if (!data?.por_hora?.length) {
    return (
      <div className="chart-container">
        <div className="empty-state">No hay datos de ventas por hora para el período seleccionado</div>
      </div>
    );
  }

  const chartData = data.por_hora.map((item) => ({
    hora: `${item.hora.toString().padStart(2, '0')}:00`,
    ventas: item.ventas,
    total: item.total,
    items: item.items_top?.join(', ') || '-',
  }));

  const maxTotal = Math.max(...chartData.map((d) => d.total));

  return (
    <div className="chart-container">
      <h4 className="chart-title">Ventas por Hora</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatMoney(value)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="hora"
              type="category"
              width={60}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                name === 'total' ? formatMoney(value) : value,
                name === 'total' ? 'Total' : 'Ventas',
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            <Bar
              dataKey="total"
              name="Total"
              fill="#2563eb"
              radius={[0, 4, 4, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="ventas"
              name="Cantidad Ventas"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}