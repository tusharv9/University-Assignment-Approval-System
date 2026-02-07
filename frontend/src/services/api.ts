import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Separate instance for file uploads (without Content-Type header)
const apiFileUpload = axios.create({
  baseURL: API_BASE_URL
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiFileUpload.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  // Don't set Content-Type for file uploads - let browser set it with boundary
  return config;
});

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      email: string;
      role: string;
      kind: 'ADMIN' | 'USER';
      createdAt: string;
    };
  };
}

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export interface DashboardOverview {
  success: boolean;
  data: {
    admin: {
      id: number;
      email: string;
      createdAt: string;
    };
    statistics: {
      totalAdmins: number;
      totalDepartments: number;
    };
    nav?: Array<{ label: string; href: string }>;
  };
}

export async function fetchDashboard() {
  const response = await api.get<DashboardOverview>('/admin/dashboard');
  return response.data;
}

export interface StudentDashboardResponse {
  success: boolean;
  data: {
    student: {
      id: number;
      email: string;
    };
    assignments: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  };
}

export async function fetchStudentDashboard() {
  const response = await api.get<StudentDashboardResponse>('/student/dashboard');
  return response.data;
}

// Professor dashboard
export interface ProfessorDashboardAssignment {
  id: number;
  title: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string | null;
  daysPending: number;
}

export interface ProfessorDashboardResponse {
  success: boolean;
  message: string;
  data: {
    pendingCount: number;
    assignments: ProfessorDashboardAssignment[];
  };
}

export async function fetchProfessorDashboard() {
  const response = await api.get<ProfessorDashboardResponse>('/professor/dashboard');
  return response.data;
}

export interface ProfessorNotification {
  id: number;
  message: string;
  type: string;
  read: boolean;
  assignmentId: number | null;
  createdAt: string;
}

export interface ProfessorNotificationsResponse {
  success: boolean;
  message: string;
  data: {
    notifications: ProfessorNotification[];
  };
}

export async function fetchProfessorNotifications() {
  const response = await api.get<ProfessorNotificationsResponse>('/professor/notifications');
  return response.data;
}

export async function markProfessorNotificationRead(notificationId: number) {
  const response = await api.patch(`/professor/notifications/${notificationId}/read`);
  return response.data as { success: boolean; message: string };
}

// Professor review & approve
export interface ProfessorReviewAssignment {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  filePath: string | null;
  createdAt: string;
  submittedAt: string | null;
  student: { id: number; name: string; email: string };
  reviewer: { id: number; name: string; email: string; role: string } | null;
  history: Array<{
    id: number;
    action: string;
    remark: string | null;
    signature: string;
    createdAt: string;
    reviewer: { id: number; name: string; email: string; role: string };
  }>;
}

export interface ProfessorReviewResponse {
  success: boolean;
  message: string;
  data: { assignment: ProfessorReviewAssignment };
}

export async function fetchProfessorReviewAssignment(assignmentId: number) {
  const response = await api.get<ProfessorReviewResponse>(
    `/professor/assignments/${assignmentId}/review`
  );
  return response.data;
}

export async function requestApproveOtp(
  assignmentId: number,
  payload: { remarks?: string; signature?: string }
) {
  const response = await api.post<{ success: boolean; message: string }>(
    `/professor/assignments/${assignmentId}/approve/request-otp`,
    payload
  );
  return response.data;
}

export async function verifyApprove(
  assignmentId: number,
  payload: { otp: string; remarks?: string; signature?: string }
) {
  const response = await api.post<{ success: boolean; message: string }>(
    `/professor/assignments/${assignmentId}/approve/verify`,
    payload
  );
  return response.data;
}

export async function rejectProfessorAssignment(
  assignmentId: number,
  payload: { remark: string }
) {
  const response = await api.post<{ success: boolean; message: string }>(
    `/professor/assignments/${assignmentId}/reject`,
    payload
  );
  return response.data;
}

// Forward assignment to another professor/HOD
export interface ForwardRecipient {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ForwardRecipientsResponse {
  success: boolean;
  message: string;
  data: { recipients: ForwardRecipient[] };
}

export async function fetchForwardRecipients() {
  const response = await api.get<ForwardRecipientsResponse>('/professor/forward-recipients');
  return response.data;
}

export async function forwardProfessorAssignment(
  assignmentId: number,
  payload: { newReviewerId: number; note?: string }
) {
  const response = await api.post<{ success: boolean; message: string }>(
    `/professor/assignments/${assignmentId}/forward`,
    payload
  );
  return response.data;
}

/** Fetch assignment file as blob for preview/download (uses auth) */
export async function fetchAssignmentFileBlob(assignmentId: number): Promise<Blob> {
  const response = await api.get(`/student/assignments/${assignmentId}/download`, {
    responseType: 'blob'
  });
  return response.data as Blob;
}

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  category: 'ASSIGNMENT' | 'THESIS' | 'REPORT';
  status: string;
  statusLabel: string;
  statusColor: string;
  filePath: string | null;
  createdAt: string;
  submittedAt?: string | null;
  reviewer: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface AssignmentsListResponse {
  success: boolean;
  message: string;
  data: {
    assignments: Assignment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface AssignmentsListQuery {
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING' | '';
  page?: number;
  limit?: number;
}

export async function fetchAssignments(params?: AssignmentsListQuery) {
  const response = await api.get<AssignmentsListResponse>('/student/assignments', {
    params
  });
  return response.data;
}

export interface AssignmentHistoryEntry {
  id: number;
  action: string;
  remark: string | null;
  signature: string;
  createdAt: string;
  reviewer: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AssignmentDetailResponse {
  success: boolean;
  message: string;
  data: {
    assignment: Assignment & {
      student: {
        id: number;
        name: string;
        email: string;
      };
      reviewer: {
        id: number;
        name: string;
        email: string;
        role: string;
      } | null;
      history: AssignmentHistoryEntry[];
    };
  };
}

export async function fetchAssignmentDetails(id: number) {
  const response = await api.get<AssignmentDetailResponse>(`/student/assignments/${id}`);
  return response.data;
}

export interface Professor {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface ProfessorsResponse {
  success: boolean;
  message: string;
  data: {
    professors: Professor[];
  };
}

export async function fetchProfessors() {
  const response = await api.get<ProfessorsResponse>('/student/professors');
  return response.data;
}

export interface SubmitAssignmentResponse {
  success: boolean;
  message: string;
  data: {
    assignment: {
      id: number;
      title: string;
      status: string;
      statusLabel: string;
      statusColor: string;
      submittedAt: string;
      reviewer: {
        id: number;
        name: string;
        email: string;
      };
    };
  };
}

export interface SubmitAssignmentPayload {
  reviewerId: number;
}

export async function submitAssignment(assignmentId: number, payload: SubmitAssignmentPayload) {
  const response = await api.post<SubmitAssignmentResponse>(
    `/student/assignments/${assignmentId}/submit`,
    payload
  );
  return response.data;
}

export interface ResubmitAssignmentResponse {
  success: boolean;
  message: string;
  data: {
    assignment: {
      id: number;
      title: string;
      status: string;
      statusLabel: string;
      statusColor: string;
      description: string | null;
      filePath: string | null;
      submittedAt: string;
      reviewer: {
        id: number;
        name: string;
        email: string;
      };
    };
  };
}

export interface ResubmitAssignmentPayload {
  description?: string;
  file?: File;
}

export async function resubmitAssignment(assignmentId: number, payload: ResubmitAssignmentPayload) {
  const formData = new FormData();
  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }
  if (payload.file) {
    formData.append('file', payload.file);
  }

  const response = await apiFileUpload.post<ResubmitAssignmentResponse>(
    `/student/assignments/${assignmentId}/resubmit`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
}

export interface UploadAssignmentResponse {
  success: boolean;
  message: string;
  data: {
    assignment: {
      id: number;
      title: string;
      description: string | null;
      category: 'ASSIGNMENT' | 'THESIS' | 'REPORT';
      status: string;
      statusLabel: string;
      statusColor: string;
      filePath: string;
      createdAt: string;
    };
  };
}

export async function uploadAssignment(formData: FormData) {
  const response = await apiFileUpload.post<UploadAssignmentResponse>(
    '/student/assignments/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
}

export interface BulkUploadAssignmentResponse {
  success: boolean;
  message: string;
  data: {
    assignments: Array<{
      id: number;
      title: string;
      description: string | null;
      category: 'ASSIGNMENT' | 'THESIS' | 'REPORT';
      status: string;
      statusLabel: string;
      statusColor: string;
      filePath: string;
      fileName: string;
      createdAt: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    errors?: Array<{
      fileName: string;
      error: string;
    }>;
  };
}

export async function bulkUploadAssignments(formData: FormData) {
  const response = await apiFileUpload.post<BulkUploadAssignmentResponse>(
    '/student/assignments/bulk-upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
}

export interface CreateDepartmentPayload {
  name: string;
  type: 'UG' | 'PG' | 'RESEARCH';
  address: string;
}

export interface DepartmentListResponse {
  success: boolean;
  data: {
    items: Array<{
      id: number;
      name: string;
      type: 'UG' | 'PG' | 'RESEARCH';
      address: string;
      userCount: number;
      actions: {
        edit: string;
        delete: string;
      };
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    filters: {
      type: string | null;
      search: string | null;
    };
  };
}

export interface DepartmentDetailResponse {
  success: boolean;
  data: {
    department: {
      id: number;
      name: string;
      type: 'UG' | 'PG' | 'RESEARCH';
      address: string;
      createdAt: string;
    };
  };
}

export async function createDepartment(payload: CreateDepartmentPayload) {
  const response = await api.post('/admin/departments/create', payload);
  return response.data;
}

export interface DepartmentListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: 'UG' | 'PG' | 'RESEARCH' | '';
}

export async function fetchDepartments(params: DepartmentListQuery) {
  const response = await api.get<DepartmentListResponse>('/admin/departments', {
    params
  });
  return response.data;
}

export async function fetchAllDepartments() {
  const response = await api.get<DepartmentListResponse>('/admin/departments', {
    params: { page: 1, pageSize: 1000 }
  });
  return response.data;
}

export async function fetchDepartment(id: number) {
  const response = await api.get<DepartmentDetailResponse>(`/admin/departments/${id}/edit`);
  return response.data;
}

export async function updateDepartment(id: number, payload: CreateDepartmentPayload) {
  const response = await api.put(`/admin/departments/${id}/update`, payload);
  return response.data;
}

export async function deleteDepartment(id: number) {
  const response = await api.delete(`/admin/departments/${id}`);
  return response.data as { success: boolean; message: string };
}


export interface CreateUserPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  departmentId: string | number;
  role: 'STUDENT' | 'PROFESSOR' | 'HOD';
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      phone: string;
      role: string;
      departmentId: number;
      createdAt: string;
    };
  };
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.post<CreateUserResponse>('/admin/users/create', payload);
  return response.data;
}

export interface UserListResponse {
  success: boolean;
  data: {
    items: Array<{
      id: number;
      name: string;
      email: string;
      role: string;
      phone: string;
      status: string;
      department: { id: number; name: string } | null;
      createdAt: string;
      actions: {
        edit: string;
        delete: string;
      };
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    filters: {
      role: string | null;
      departmentId: string | null;
      search: string | null;
    };
  };
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: 'STUDENT' | 'PROFESSOR' | 'HOD' | '';
  departmentId?: string | number;
}

export async function fetchUsers(params: UserListQuery) {
  const response = await api.get<UserListResponse>('/admin/users', { params });
  return response.data;
}

export interface UserDetailResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      phone: string;
      role: string;
      departmentId: number | null;
      department: { id: number; name: string } | null;
      createdAt: string;
    };
  };
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  phone: string;
  departmentId: string | number;
  password?: string;
}

export async function fetchUser(id: number) {
  const response = await api.get<UserDetailResponse>(`/admin/users/${id}/edit`);
  return response.data;
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  const response = await api.put(`/admin/users/${id}/update`, payload);
  return response.data as { success: boolean; message: string };
}

export async function deleteUser(id: number) {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data as { success: boolean; message: string };
}



export default api;


