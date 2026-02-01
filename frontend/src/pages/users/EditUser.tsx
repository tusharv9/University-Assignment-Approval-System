import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  fetchAllDepartments,
  fetchUser,
  updateUser,
  DepartmentListResponse
} from '../../services/api';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required' }).max(120),
  email: z.string().email({ message: 'Enter a valid email address' }),
  phone: z.string().min(6, { message: 'Phone is required' }),
  departmentId: z.string().min(1, { message: 'Department is required' }),
  password: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
});

type UserFormValues = z.infer<typeof userSchema>;

const EditUserPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      departmentId: '',
      password: ''
    }
  });

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetchAllDepartments();
        const items =
          (response?.data?.items as DepartmentListResponse['data']['items']) ?? [];
        setDepartments(items.map((dept) => ({ id: dept.id, name: dept.name })));
      } catch (error) {
        console.warn('Failed to load departments for user edit', error);
      }
    };
    loadDepartments();
  }, []);

  useEffect(() => {
    const userId = Number(id);
    if (!id || Number.isNaN(userId)) {
      setServerError('Invalid user id');
      setLoading(false);
      return;
    }

    let active = true;
    const loadUser = async () => {
      try {
        setLoading(true);
        const response = await fetchUser(userId);
        if (!active) return;
        const { user } = response.data;
        reset({
          name: user.name,
          email: user.email,
          phone: user.phone,
          departmentId: user.departmentId ? String(user.departmentId) : '',
          password: ''
        });
        setRole(user.role);
        setServerError(null);
      } catch (error) {
        if (!active) return;
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as { response?: { data?: { message?: string } } }).response?.data?.message
        ) {
          setServerError(
            (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'Failed to load user'
          );
        } else if (error instanceof Error) {
          setServerError(error.message);
        } else {
          setServerError('Failed to load user');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [id, reset]);

  const onSubmit = async (values: UserFormValues) => {
    const userId = Number(id);
    if (!id || Number.isNaN(userId)) {
      setServerError('Invalid user id');
      return;
    }

    setServerMessage(null);
    setServerError(null);

    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        departmentId: Number(values.departmentId),
        password: values.password?.trim() ? values.password : undefined
      };
      const response = await updateUser(userId, payload);
      setServerMessage(response?.message ?? 'User updated successfully');
      setTimeout(() => navigate('/users'), 800);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to update user'
        );
      } else if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to update user. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="card">Loading user...</div>;
  }

  if (serverError && !serverMessage) {
    return <div className="card form__error">{serverError}</div>;
  }

  return (
    <div className="card">
      <h2>Edit User</h2>
      <p>Update user account details. Role changes are restricted.</p>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="name">
            Name
          </label>
          <input id="name" type="text" className="form__input" {...register('name')} />
          {errors.name && <span className="form__error">{errors.name.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="form__input" {...register('email')} />
          {errors.email && <span className="form__error">{errors.email.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" type="text" className="form__input" {...register('phone')} />
          {errors.phone && <span className="form__error">{errors.phone.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="departmentId">
            Department
          </label>
          <select id="departmentId" className="form__select" {...register('departmentId')}>
            <option value="">Select a department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {errors.departmentId && (
            <span className="form__error">{errors.departmentId.message}</span>
          )}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="role">
            Role
          </label>
          <input
            id="role"
            type="text"
            className="form__input"
            value={role}
            disabled
            readOnly
          />
          <span className="form__hint">Role changes are restricted for security reasons.</span>
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="password">
            Password (optional)
          </label>
          <input
            id="password"
            type="password"
            className="form__input"
            placeholder="Leave blank to keep current password"
            {...register('password')}
          />
          {errors.password && <span className="form__error">{errors.password.message}</span>}
        </div>

        {serverMessage && <div className="form__success">{serverMessage}</div>}
        {serverError && <div className="form__error">{serverError}</div>}

        <div>
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUserPage;

