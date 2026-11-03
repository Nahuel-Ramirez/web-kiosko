import { useApp } from '../../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

export function PeakHoursChart({ data }) {
  const { formatMoney } = useApp();

  if (!data?.horas_pico?.length) {
    return (
      <div className="chart-container">
        <div className="empty-state">No se detectaron horas pico para el período seleccionado</div>
      </div>
    );
  }

  const chartData = data.horas_pico.map((item, index) => ({
    label: `${item.hora_inicio}:00-${item.hora_fin}:00`,
    ventas: item.ventas_esperadas,
    motivo: item.motivo || 'Pico detectado',
    color: index % 2 === 0 ? '#ef4444' : '#f59e0b'
  }));

  return (
    <div className="chart-container">
      <h4 className="chart-title">Horas Pico Detectadas</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={80}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                name === 'ventas' ? `${value} ventas` : value,
                name === 'ventas' ? 'Ventas Esperadas' : 'Período',
              ]}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Bar
              dataKey="ventas"
              name="Ventas Esperadas"
              radius={[0, 4, 4, 0]}
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-custom">
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#ef4444' }} />
          Horas pico fuertes
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#f59e0b' }} />
          Horas pico moderadas
        </span>
      </div>
    </div>
  );
}