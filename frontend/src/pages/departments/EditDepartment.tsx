import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchDepartment, updateDepartment } from '../../services/api';

const departmentSchema = z.object({
  name: z.string().min(2, { message: 'Department name is required' }).max(120),
  type: z.enum(['UG', 'PG', 'RESEARCH'], {
    required_error: 'Program type is required'
  }),
  address: z.string().min(5, { message: 'Address is required' }).max(250)
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

const EditDepartmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      type: 'UG',
      address: ''
    }
  });

  useEffect(() => {
    const departmentId = Number(id);
    if (!id || Number.isNaN(departmentId)) {
      setServerError('Invalid department id');
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchDepartment(departmentId);
        if (!active) return;
        const { department } = response.data;
        reset({
          name: department.name,
          type: department.type,
          address: department.address
        });
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
              'Failed to load department'
          );
        } else if (error instanceof Error) {
          setServerError(error.message);
        } else {
          setServerError('Failed to load department');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id, reset]);

  const onSubmit = async (values: DepartmentFormValues) => {
    const departmentId = Number(id);
    if (!id || Number.isNaN(departmentId)) {
      setServerError('Invalid department id');
      return;
    }

    setServerMessage(null);
    setServerError(null);

    try {
      const response = await updateDepartment(departmentId, values);
      setServerMessage(response?.message ?? 'Department updated successfully');
      setTimeout(() => {
        navigate('/departments');
      }, 800);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to update department'
        );
      } else if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to update department. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="card">Loading department...</div>;
  }

  if (serverError && !isSubmitting && !serverMessage) {
    return <div className="card form__error">{serverError}</div>;
  }

  return (
    <div className="card">
      <h2>Edit Department</h2>
      <p>Update department details to keep information accurate.</p>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="name">
            Department Name
          </label>
          <input
            id="name"
            type="text"
            className="form__input"
            placeholder="Department name"
            {...register('name')}
          />
          {errors.name && <span className="form__error">{errors.name.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="type">
            Program Type
          </label>
          <select id="type" className="form__select" {...register('type')}>
            <option value="UG">Undergraduate (UG)</option>
            <option value="PG">Postgraduate (PG)</option>
            <option value="RESEARCH">Research</option>
          </select>
          {errors.type && <span className="form__error">{errors.type.message}</span>}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            rows={3}
            className="form__textarea"
            placeholder="Building, Campus, City"
            {...register('address')}
          />
          {errors.address && <span className="form__error">{errors.address.message}</span>}
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

export default EditDepartmentPage;


