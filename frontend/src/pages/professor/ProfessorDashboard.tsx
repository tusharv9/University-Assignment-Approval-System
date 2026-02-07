import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProfessorDashboard,
  fetchProfessorNotifications,
  markProfessorNotificationRead,
  ProfessorDashboardResponse,
  ProfessorNotificationsResponse
} from '../../services/api';

const ProfessorDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<ProfessorDashboardResponse['data'] | null>(null);
  const [notifications, setNotifications] = useState<ProfessorNotificationsResponse['data']['notifications']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, notifRes] = await Promise.all([
        fetchProfessorDashboard(),
        fetchProfessorNotifications()
      ]);
      setDashboardData(dashboardRes.data);
      setNotifications(notifRes.data.notifications);
    } catch (err) {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleMarkNotificationRead = async (notificationId: number) => {
    try {
      await markProfessorNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      if (dashboardData && notifications.some((n) => n.id === notificationId && n.assignmentId)) {
        await loadDashboard();
      }
    } catch {
      // ignore
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) return <div className="card">Loading dashboard...</div>;
  if (error) return <div className="card form__error">{error}</div>;
  if (!dashboardData) return null;

  const { pendingCount, assignments } = dashboardData;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="page__header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page__title">Professor Dashboard</h1>
            <p className="page__subtitle">Manage your assignment review workload</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {unreadCount > 0 && (
              <span
                className="badge"
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid--cols-3" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card">
          <span className="stat-card__label">Pending reviews</span>
          <span className="stat-card__value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {pendingCount}
            {pendingCount > 0 && (
              <span
                className="badge"
                style={{
                  background: '#ea580c',
                  color: '#fff',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Awaiting review
              </span>
            )}
          </span>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Notifications</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notifications.slice(0, 10).map((n) => (
              <li
                key={n.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  backgroundColor: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.06)'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                  <small style={{ color: '#64748b' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {n.assignmentId && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => navigate(`/student/assignments/${n.assignmentId}`)}
                    >
                      View
                    </button>
                  )}
                  {!n.read && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleMarkNotificationRead(n.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Assignments awaiting review</h2>
        {assignments.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No assignments pending review.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student name</th>
                  <th>Title</th>
                  <th>Submitted date</th>
                  <th>Days pending</th>
                  <th style={{ width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.studentName}</td>
                    <td>{a.title}</td>
                    <td>{formatDate(a.submittedAt)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: a.daysPending > 7 ? '#dc2626' : a.daysPending > 3 ? '#ea580c' : '#0f172a'
                        }}
                      >
                        {a.daysPending} day{a.daysPending !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="button"
                          onClick={() => navigate(`/professor/assignments/${a.id}/review`)}
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => navigate(`/student/assignments/${a.id}`)}
                        >
                          View details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorDashboardPage;
