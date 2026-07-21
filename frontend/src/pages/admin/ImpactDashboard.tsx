import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import { FileText, Clock, Building2 } from "lucide-react";
import { getImpactStats } from "../../services/adminApi";
import Loader from "../../components/Loader";

const BRAND_BLUE = "#2563eb";
const MUTED = "#94a3b8";
const GRID = "#e2e8f0";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ImpactDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getImpactStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load impact stats.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Impact Dashboard</h1>
          <p>System-wide referral activity across all connected facilities.</p>
        </div>
      </div>

      {loading && <div className="admin-empty-state"><Loader /></div>}
      {!loading && error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && stats && (
        <>
          <div className="admin-stats-row">
            <div className="admin-stat-tile">
              <span className="admin-stat-tile-icon"><FileText size={18} /></span>
              <div>
                <p className="admin-stat-tile-value">{stats.totalReferrals}</p>
                <p className="admin-stat-tile-label">Total Referrals</p>
              </div>
            </div>
            <div className="admin-stat-tile">
              <span className="admin-stat-tile-icon"><Clock size={18} /></span>
              <div>
                <p className="admin-stat-tile-value">{formatDuration(stats.avgTurnaroundSeconds)}</p>
                <p className="admin-stat-tile-label">Avg Response Time</p>
              </div>
            </div>
            <div className="admin-stat-tile">
              <span className="admin-stat-tile-icon"><Building2 size={18} /></span>
              <div>
                <p className="admin-stat-tile-value">{stats.facilitiesConnected}</p>
                <p className="admin-stat-tile-label">Facilities Connected</p>
              </div>
            </div>
          </div>

          <div className="admin-chart-card">
            <p className="admin-chart-title">Referrals Over Time (Last 30 Days)</p>
            {stats.referralsOverTime.length === 0 ? (
              <div className="admin-empty-state">No referrals in the last 30 days.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.referralsOverTime} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    stroke={MUTED}
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                  />
                  <YAxis allowDecimals={false} stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    labelFormatter={(value) => formatDay(value as string)}
                    formatter={(value: any) => [value, "Referrals"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={BRAND_BLUE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: BRAND_BLUE, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="admin-chart-card">
            <p className="admin-chart-title">Top Facilities by Referral Volume</p>
            {stats.facilityLeaderboard.length === 0 ? (
              <div className="admin-empty-state">No referrals recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, stats.facilityLeaderboard.length * 44)}>
                <BarChart
                  data={stats.facilityLeaderboard}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} stroke={MUTED} fontSize={12} tickLine={false} axisLine={{ stroke: GRID }} />
                  <YAxis type="category" dataKey="name" stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} width={140} />
                  <Tooltip
                    formatter={(value: any) => [value, "Referrals"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Bar dataKey="count" fill={BRAND_BLUE} radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default ImpactDashboard;
