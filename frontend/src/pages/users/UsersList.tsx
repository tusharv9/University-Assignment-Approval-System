import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchUsers,
  fetchAllDepartments,
  deleteUser,
  UserListResponse,
  UserListQuery,
  DepartmentListResponse
} from '../../services/api';

const PAGE_SIZE = 20;
const roles = [
  { value: '', label: 'All roles' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'HOD', label: 'Head of Department' }
];

const UsersListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserListResponse['data'] | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [departments, setDepartments] = useState<
    Array<{ id: number; name: string }> | null
  >(null);

  const loadUsers = async (query: UserListQuery) => {
    try {
      setLoading(true);
      const response = await fetchUsers(query);
      setData(response.data);
      setError(null);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setError(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Unable to load users'
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers({
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      role: (role as UserListQuery['role']) || undefined,
      departmentId: departmentId || undefined
    });
  }, [page, search, role, departmentId]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetchAllDepartments();
        const deptItems =
          (response?.data?.items as DepartmentListResponse['data']['items']) ?? [];
        setDepartments(deptItems.map((dept) => ({ id: dept.id, name: dept.name })));
      } catch (err) {
        console.warn('Failed to load departments list', err);
      }
    };

    loadDepartments();
  }, []);

  const totalPages = useMemo(
    () => data?.pagination.totalPages ?? 1,
    [data?.pagination.totalPages]
  );
  const totalItems = useMemo(() => data?.pagination.total ?? 0, [data?.pagination.total]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    const value = new FormData(event.currentTarget).get('search');
    setSearch(String(value ?? ''));
  };

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(event.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentId(event.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setDepartmentId('');
    setPage(1);
  };

  const handlePrevious = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const refreshUsers = () => {
    return loadUsers({
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      role: (role as UserListQuery['role']) || undefined,
      departmentId: departmentId || undefined
    });
  };

  const handleDelete = async (userId: number, name: string) => {
    setActionMessage(null);
    const confirmed = window.confirm(
      `Are you sure you want to delete the user "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await deleteUser(userId);
      if (response?.success) {
        setActionMessage(response.message ?? 'User deleted successfully');

        const currentTotal = data?.pagination.total ?? 1;
        const remaining = Math.max(currentTotal - 1, 0);
        const nextTotalPages = Math.max(Math.ceil(remaining / PAGE_SIZE), 1);

        if (page > nextTotalPages) {
          setPage(nextTotalPages);
        } else {
          await refreshUsers();
        }
      } else {
        setActionMessage(response?.message ?? 'Failed to delete user');
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
            'Failed to delete user'
        );
      } else if (err instanceof Error) {
        setActionMessage(err.message);
      } else {
        setActionMessage('Failed to delete user. Please try again.');
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
            placeholder="Search by name or email"
            defaultValue={search}
          />
        </form>

        <select className="form__select" value={role} onChange={handleRoleChange}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          className="form__select"
          value={departmentId}
          onChange={handleDepartmentChange}
        >
          <option value="">All departments</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <button type="button" className="button button--ghost" onClick={handleResetFilters}>
          Reset
        </button>
      </div>

      {loading && <div>Loading users...</div>}
      {error && !loading && <div className="form__error">{error}</div>}
      {actionMessage && !loading && !error && (
        <div className="form__success">{actionMessage}</div>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="empty-state">No users found. Adjust your filters or search.</div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.department?.name ?? 'Unassigned'}</td>
                    <td>
                      <span className="chip">{user.status}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => navigate(`/users/${user.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => handleDelete(user.id, user.name)}
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
              Showing page {page} of {totalPages} ({totalItems} users)
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

export default UsersListPage;

