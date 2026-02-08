import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDepartments, deleteDepartment, DepartmentListResponse } from '../../services/api';

const PAGE_SIZE = 10;

const programTypeLabels: Record<string, string> = {
  UG: 'Undergraduate',
  PG: 'Postgraduate',
  RESEARCH: 'Research'
};

const DepartmentsListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'UG' | 'PG' | 'RESEARCH'>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DepartmentListResponse['data'] | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetchDepartments({
          page,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          type: type || undefined
        });
        if (!active) return;
        setData(response.data);
        setError(null);
      } catch (err) {
        if (!active) return;
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
              'Unable to load departments'
          );
        } else {
          setError('Unable to load departments');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDepartments();

    return () => {
      active = false;
    };
  }, [page, search, type]);

  const totalPages = useMemo(() => data?.pagination.totalPages ?? 1, [data?.pagination.totalPages]);
  const totalItems = useMemo(() => data?.pagination.total ?? 0, [data?.pagination.total]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    const formData = new FormData(event.currentTarget);
    setSearch(String(formData.get('search') ?? ''));
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const v = event.target.value;
    setType(v === 'UG' || v === 'PG' || v === 'RESEARCH' ? v : '');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setType('');
    setPage(1);
  };

  const handlePrevious = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleDelete = async (id: number, name: string) => {
    setActionMessage(null);
    const confirmed = window.confirm(
      `Are you sure you want to delete the department "${name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await deleteDepartment(id);
      if (response?.success) {
        setActionMessage(response.message ?? 'Department deleted successfully');
        setData((prev) => {
          if (!prev) return prev;
          const nextItems = prev.items.filter((d) => d.id !== id);
          const nextTotal = Math.max(prev.pagination.total - 1, 0);
          const nextTotalPages = Math.max(Math.ceil(nextTotal / PAGE_SIZE), 1);
          return {
            ...prev,
            items: nextItems,
            pagination: {
              ...prev.pagination,
              total: nextTotal,
              totalPages: nextTotalPages
            }
          };
        });
      } else {
        setActionMessage(response?.message ?? 'Failed to delete department');
      }
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setActionMessage(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to delete department'
        );
      } else if (err instanceof Error) {
        setActionMessage(err.message);
      } else {
        setActionMessage('Failed to delete department. Please try again.');
      }
    }
  };

  return (
    <div className="card">
      <div className="filters">
        <form className="filters__search" onSubmit={handleSearchSubmit}>
          <input
            name="search"
            type="search"
            className="form__input"
            placeholder="Search by department name"
            defaultValue={search}
          />
        </form>

        <select
          value={type}
          className="form__select"
          onChange={handleFilterChange}
          aria-label="Filter by program type"
        >
          <option value="">All Types</option>
          <option value="UG">Undergraduate (UG)</option>
          <option value="PG">Postgraduate (PG)</option>
          <option value="RESEARCH">Research</option>
        </select>

        <button type="button" className="button button--ghost" onClick={handleResetFilters}>
          Reset
        </button>
      </div>

      {loading && <div>Loading departments...</div>}
      {error && !loading && <div className="form__error">{error}</div>}
      {actionMessage && !loading && !error && (
        <div className="form__success" style={{ marginTop: '0.5rem' }}>
          {actionMessage}
        </div>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="empty-state">No departments found. Try adjusting your filters.</div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Address</th>
                  <th scope="col">Users</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((dept) => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td>
                      <span className="chip">{programTypeLabels[dept.type] ?? dept.type}</span>
                    </td>
                    <td>{dept.address}</td>
                    <td>{dept.userCount}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => navigate(`/departments/${dept.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => handleDelete(dept.id, dept.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div>
              Showing page {page} of {totalPages} ({totalItems} departments)
            </div>

            <div className="pagination__controls">
              <button
                type="button"
                className="button button--ghost"
                onClick={handlePrevious}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="button"
                onClick={handleNext}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentsListPage;


