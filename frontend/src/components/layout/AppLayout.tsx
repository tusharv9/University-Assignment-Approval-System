import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
  { to: '/departments', label: 'Departments', roles: ['ADMIN'] },
  { to: '/departments/create', label: 'Create Department', roles: ['ADMIN'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
  { to: '/users/create', label: 'Create User', roles: ['ADMIN'] },
  { to: '/student/dashboard', label: 'Student Dashboard', roles: ['STUDENT', 'PROFESSOR', 'HOD'] },
  { to: '/student/assignments/upload', label: 'Upload Assignment', roles: ['STUDENT', 'PROFESSOR', 'HOD'] }
];

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">UAAP</span>
          <p className="sidebar__subtitle">Admin Console</p>
        </div>

        <nav className="sidebar__nav">
          {links
            .filter((link) => !link.roles || (user && link.roles.includes(user.role)))
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                end
              >
                {link.label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="main">
        <header className="header">
          <div>
            <h1 className="header__title">University Assignment Approval Platform</h1>
            <p className="header__subtitle">Welcome back, {user?.email}</p>
          </div>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;


