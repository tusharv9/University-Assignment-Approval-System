import { useEffect, useState } from 'react';
import { fetchDashboard, DashboardOverview } from '../services/api';

const DashboardPage = () => {
  const [data, setData] = useState<DashboardOverview['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchDashboard();
        if (mounted) {
          setData(response.data);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ) {
          setError(
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'Failed to load dashboard'
          );
        } else {
          setError('Failed to load dashboard');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid grid--cols-3">
      {loading && <div className="card">Loading dashboard...</div>}
      {error && !loading && <div className="card form__error">{error}</div>}
      {!loading && !error && data && (
        <>
          <div className="card stat-card">
            <span className="stat-card__label">Total Departments</span>
            <span className="stat-card__value">{data.statistics.totalDepartments}</span>
          </div>
          <div className="card stat-card">
            <span className="stat-card__label">Administrators</span>
            <span className="stat-card__value">{data.statistics.totalAdmins}</span>
          </div>
          <div className="card stat-card">
            <span className="stat-card__label">Quick Navigation</span>
            <div>
              {data.nav?.map((item) => (
                <div key={item.href}>{item.label}</div>
              )) ?? 'Departments & Users'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;


