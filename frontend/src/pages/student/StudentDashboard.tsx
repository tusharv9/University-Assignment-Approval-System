import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentDashboard, StudentDashboardResponse } from '../../services/api';

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchStudentDashboard();
        if (!active) return;
        setData(response.data);
        setError(null);
      } catch (err) {
        if (!active) return;
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ) {
          setError(
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'Failed to load dashboard'
          );
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="card">Loading dashboard...</div>;
  if (error) return <div className="card form__error">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="page__header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page__title">Student Dashboard</h1>
            <p className="page__subtitle">Track your assignment submissions</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => navigate('/student/assignments')}
            >
              View All Assignments
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => navigate('/student/assignments/bulk-upload')}
            >
              Bulk Upload
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => navigate('/student/assignments/upload')}
            >
              Upload New Assignment
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid--cols-3">
        <div className="card stat-card">
          <span className="stat-card__label">Pending Assignments</span>
          <span className="stat-card__value">{data.assignments.pending}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-card__label">Approved</span>
          <span className="stat-card__value">{data.assignments.approved}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-card__label">Rejected</span>
          <span className="stat-card__value">{data.assignments.rejected}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;

