import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from '../components/ProtectedRoute';

function defaultDashboardPath(role: string | undefined): string {
  if (role === 'ADMIN') return '/dashboard';
  if (role === 'PROFESSOR') return '/professor/dashboard';
  return '/student/dashboard';
}
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/Login';
import DashboardPage from '../pages/Dashboard';
import DepartmentsListPage from '../pages/departments/DepartmentsList';
import CreateDepartmentPage from '../pages/departments/CreateDepartment';
import EditDepartmentPage from '../pages/departments/EditDepartment';
import UsersListPage from '../pages/users/UsersList';
import CreateUserPage from '../pages/users/CreateUser';
import EditUserPage from '../pages/users/EditUser';
import StudentDashboardPage from '../pages/student/StudentDashboard';
import UploadAssignmentPage from '../pages/student/UploadAssignment';
import BulkUploadAssignmentPage from '../pages/student/BulkUploadAssignment';
import MyAssignmentsPage from '../pages/student/MyAssignments';
import AssignmentDetailsPage from '../pages/student/AssignmentDetails';
import ProfessorDashboardPage from '../pages/professor/ProfessorDashboard';
import ReviewAssignmentPage from '../pages/professor/ReviewAssignment';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={defaultDashboardPath(user?.role)} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="student/dashboard" element={<StudentDashboardPage />} />
          <Route path="student/assignments/upload" element={<UploadAssignmentPage />} />
          <Route path="student/assignments/bulk-upload" element={<BulkUploadAssignmentPage />} />
          <Route path="student/assignments/:id" element={<AssignmentDetailsPage />} />
          <Route path="student/assignments" element={<MyAssignmentsPage />} />
          <Route path="professor/dashboard" element={<ProfessorDashboardPage />} />
          <Route path="professor/assignments/:id/review" element={<ReviewAssignmentPage />} />
          <Route path="departments">
            <Route index element={<DepartmentsListPage />} />
            <Route path="create" element={<CreateDepartmentPage />} />
            <Route path=":id/edit" element={<EditDepartmentPage />} />
          </Route>
          <Route path="users">
            <Route index element={<UsersListPage />} />
            <Route path="create" element={<CreateUserPage />} />
            <Route path=":id/edit" element={<EditUserPage />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? defaultDashboardPath(user?.role) : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}

export default AppRoutes;


