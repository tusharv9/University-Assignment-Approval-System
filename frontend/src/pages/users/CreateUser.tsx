import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUser,
  fetchAllDepartments,
  CreateUserPayload,
  DepartmentListResponse
} from '../../services/api';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required' }).max(120),
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  phone: z.string().min(6, { message: 'Phone is required' }),
  departmentId: z.string().min(1, { message: 'Department is required' }),
  role: z.enum(['STUDENT', 'PROFESSOR', 'HOD'], {
    errorMap: () => ({ message: 'Role is required' })
  })
});

type UserFormValues = z.infer<typeof userSchema>;

const roleOptions = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PROFESSOR', label: 'Professor' },
  { value: 'HOD', label: 'Head of Department' }
];

const CreateUserPage = () => {
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
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
      password: '',
      phone: '',
      departmentId: '',
      role: 'STUDENT'
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
        console.warn('Failed to load departments for user creation', error);
      }
    };

    loadDepartments();
  }, []);

  const onSubmit = async (values: UserFormValues) => {
    setServerMessage(null);
    setServerError(null);

    const payload: CreateUserPayload = {
      ...values,
      departmentId: Number(values.departmentId)
    };

    try {
      const response = await createUser(payload);
      setServerMessage(response?.message ?? 'User created successfully');
      reset({
        name: '',
        email: '',
        password: '',
        phone: '',
        departmentId: '',
        role: 'STUDENT'
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to create user'
        );
      } else if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to create user. Please try again.');
      }
    }
  };

  return (
    <div className="card">
      <h2>Create User</h2>
      <p>Provision a new student, professor, or HOD account.</p>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="form__input"
            placeholder="John Doe"
            {...register('name')}
          />
          {errors.name && <span className="form__error">{errors.name.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form__input"
            placeholder="user@university.edu"
            {...register('email')}
          />
          {errors.email && <span className="form__error">{errors.email.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="form__input"
            placeholder="Set a default password"
            {...register('password')}
          />
          {errors.password && <span className="form__error">{errors.password.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            type="text"
            className="form__input"
            placeholder="+91 1234567890"
            {...register('phone')}
          />
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
          <select id="role" className="form__select" {...register('role')}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role && <span className="form__error">{errors.role.message}</span>}
        </div>

        {serverMessage && <div className="form__success">{serverMessage}</div>}
        {serverError && <div className="form__error">{serverError}</div>}

        <div>
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserPage;

