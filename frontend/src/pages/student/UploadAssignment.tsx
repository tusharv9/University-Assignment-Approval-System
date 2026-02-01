import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { uploadAssignment } from '../../services/api';

const assignmentSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }).max(200, { message: 'Title must be less than 200 characters' }),
  description: z.string().max(1000, { message: 'Description must be less than 1000 characters' }).optional(),
  category: z.enum(['ASSIGNMENT', 'THESIS', 'REPORT'], {
    errorMap: () => ({ message: 'Category is required' })
  }),
  file: z.instanceof(FileList).refine((files) => files.length > 0, {
    message: 'File is required'
  }).refine((files) => files[0]?.type === 'application/pdf', {
    message: 'Only PDF files are allowed'
  }).refine((files) => files[0]?.size <= 10 * 1024 * 1024, {
    message: 'File size must be less than 10MB'
  })
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

const categoryOptions = [
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'THESIS', label: 'Thesis' },
  { value: 'REPORT', label: 'Report' }
];

const UploadAssignmentPage = () => {
  const navigate = useNavigate();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'ASSIGNMENT'
    }
  });

  const selectedFile = watch('file');

  const onSubmit = async (values: AssignmentFormValues) => {
    setServerMessage(null);
    setServerError(null);
    setIsSubmitting(true);

    try {
      const file = values.file[0];
      const formData = new FormData();
      formData.append('title', values.title);
      if (values.description) {
        formData.append('description', values.description);
      }
      formData.append('category', values.category);
      formData.append('file', file);

      const response = await uploadAssignment(formData);
      setServerMessage(response?.message ?? `Assignment uploaded successfully with ID: ${response?.data?.assignment?.id}`);
      
      // Reset form after successful upload
      reset({
        title: '',
        description: '',
        category: 'ASSIGNMENT'
      });
      
      // Clear file input
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Optionally navigate to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to upload assignment'
        );
      } else if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to upload assignment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Upload Assignment</h1>
        <p className="page__subtitle">Upload your assignment file for review</p>
      </div>

      <div className="card">
        {serverMessage && (
          <div className="form__success">
            <p>{serverMessage}</p>
          </div>
        )}

        {serverError && (
          <div className="form__error">
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div className="form__group">
            <label htmlFor="title" className="form__label">
              Title <span className="form__required">*</span>
            </label>
            <input
              type="text"
              id="title"
              {...register('title')}
              className={`form__input ${errors.title ? 'form__input--error' : ''}`}
              placeholder="Enter assignment title"
            />
            {errors.title && (
              <span className="form__error-message">{errors.title.message}</span>
            )}
          </div>

          <div className="form__group">
            <label htmlFor="description" className="form__label">
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              className={`form__input form__textarea ${errors.description ? 'form__input--error' : ''}`}
              placeholder="Enter assignment description (optional)"
              rows={4}
            />
            {errors.description && (
              <span className="form__error-message">{errors.description.message}</span>
            )}
          </div>

          <div className="form__group">
            <label htmlFor="category" className="form__label">
              Category <span className="form__required">*</span>
            </label>
            <select
              id="category"
              {...register('category')}
              className={`form__input form__select ${errors.category ? 'form__input--error' : ''}`}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="form__error-message">{errors.category.message}</span>
            )}
          </div>

          <div className="form__group">
            <label htmlFor="file" className="form__label">
              File (PDF only, max 10MB) <span className="form__required">*</span>
            </label>
            <input
              type="file"
              id="file"
              accept=".pdf,application/pdf"
              {...register('file')}
              className={`form__input form__file ${errors.file ? 'form__input--error' : ''}`}
            />
            {errors.file && (
              <span className="form__error-message">{errors.file.message}</span>
            )}
            {selectedFile && selectedFile[0] && (
              <div className="form__file-info">
                <p>
                  <strong>Selected file:</strong> {selectedFile[0].name}
                </p>
                <p>
                  <strong>Size:</strong> {formatFileSize(selectedFile[0].size)}
                </p>
                {selectedFile[0].size > 10 * 1024 * 1024 && (
                  <p className="form__error-message">
                    File size exceeds 10MB limit
                  </p>
                )}
                {selectedFile[0].type !== 'application/pdf' && (
                  <p className="form__error-message">
                    Only PDF files are allowed
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="form__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Uploading...' : 'Upload Assignment'}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => navigate('/student/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadAssignmentPage;

