import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDepartment } from '../../services/api';

const departmentSchema = z.object({
  name: z.string().min(2, { message: 'Department name is required' }).max(120),
  type: z.enum(['UG', 'PG', 'RESEARCH'], {
    required_error: 'Program type is required'
  }),
  address: z.string().min(5, { message: 'Address is required' }).max(250)
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

const defaultValues: DepartmentFormValues = {
  name: '',
  type: 'UG',
  address: ''
};

const CreateDepartmentPage = () => {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues
  });

  const onSubmit = async (values: DepartmentFormValues) => {
    setServerMessage(null);
    setServerError(null);
    try {
      const response = await createDepartment(values);
      setServerMessage(response?.message ?? 'Department created successfully');
      reset(defaultValues);
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to create department'
        );
      } else {
        setServerError('Failed to create department. Please try again.');
      }
    }
  };

  return (
    <div className="card">
      <h2>Create Department</h2>
      <p>Organize users by creating academic departments.</p>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="name">
            Department Name
          </label>
          <input
            id="name"
            type="text"
            className="form__input"
            placeholder="Computer Science"
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
            {isSubmitting ? 'Saving...' : 'Create Department'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDepartmentPage;


