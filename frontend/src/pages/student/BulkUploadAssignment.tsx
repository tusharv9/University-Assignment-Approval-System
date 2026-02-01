import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { bulkUploadAssignments, BulkUploadAssignmentResponse } from '../../services/api';

const bulkUploadSchema = z.object({
  description: z.string().max(1000, { message: 'Description must be less than 1000 characters' }).optional(),
  category: z.enum(['ASSIGNMENT', 'THESIS', 'REPORT'], {
    errorMap: () => ({ message: 'Category is required' })
  }),
  files: z.instanceof(FileList)
    .refine((files) => files.length > 0, {
      message: 'At least one file is required'
    })
    .refine((files) => files.length <= 5, {
      message: 'Maximum 5 files allowed'
    })
    .refine((files) => {
      return Array.from(files).every(file => file.type === 'application/pdf');
    }, {
      message: 'Only PDF files are allowed'
    })
    .refine((files) => {
      return Array.from(files).every(file => file.size <= 10 * 1024 * 1024);
    }, {
      message: 'Each file must be less than 10MB'
    })
});

type BulkUploadFormValues = z.infer<typeof bulkUploadSchema>;

const categoryOptions = [
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'THESIS', label: 'Thesis' },
  { value: 'REPORT', label: 'Report' }
];

const BulkUploadAssignmentPage = () => {
  const navigate = useNavigate();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedAssignments, setUploadedAssignments] = useState<BulkUploadAssignmentResponse['data']['assignments'] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch
  } = useForm<BulkUploadFormValues>({
    resolver: zodResolver(bulkUploadSchema),
    defaultValues: {
      description: '',
      category: 'ASSIGNMENT'
    }
  });

  const selectedFiles = watch('files');

  const onSubmit = async (values: BulkUploadFormValues) => {
    setServerMessage(null);
    setServerError(null);
    setIsSubmitting(true);
    setUploadedAssignments(null);

    try {
      const formData = new FormData();
      if (values.description) {
        formData.append('description', values.description);
      }
      formData.append('category', values.category);
      
      // Append all files
      Array.from(values.files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await bulkUploadAssignments(formData);
      setServerMessage(response?.message ?? `Successfully uploaded ${response?.data?.assignments?.length || 0} assignment(s)`);
      setUploadedAssignments(response?.data?.assignments || []);
      
      // Reset form after successful upload
      reset({
        description: '',
        category: 'ASSIGNMENT'
      });
      
      // Clear file input
      const fileInput = document.getElementById('files') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setServerError(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to upload assignments'
        );
      } else if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to upload assignments. Please try again.');
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Bulk Upload Assignments</h1>
        <p className="page__subtitle">Upload multiple assignment files at once (up to 5 files)</p>
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

        {!uploadedAssignments && (
          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <div className="form__group">
              <label htmlFor="description" className="form__label">
                Common Description (applied to all files)
              </label>
              <textarea
                id="description"
                {...register('description')}
                className={`form__input form__textarea ${errors.description ? 'form__input--error' : ''}`}
                placeholder="Enter a common description for all assignments (optional)"
                rows={4}
              />
              {errors.description && (
                <span className="form__error-message">{errors.description.message}</span>
              )}
            </div>

            <div className="form__group">
              <label htmlFor="category" className="form__label">
                Category (applied to all files) <span className="form__required">*</span>
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
              <label htmlFor="files" className="form__label">
                Files (PDF only, max 5 files, 10MB each) <span className="form__required">*</span>
              </label>
              <input
                type="file"
                id="files"
                accept=".pdf,application/pdf"
                multiple
                {...register('files')}
                className={`form__input form__file ${errors.files ? 'form__input--error' : ''}`}
              />
              {errors.files && (
                <span className="form__error-message">{errors.files.message}</span>
              )}
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="form__file-info" style={{ marginTop: '1rem' }}>
                  <p><strong>Selected files ({selectedFiles.length}/5):</strong></p>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{file.name}</span>
                          <span style={{ fontSize: '0.875rem', color: '#666' }}>
                            {formatFileSize(file.size)}
                            {file.size > 10 * 1024 * 1024 && (
                              <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠ Exceeds 10MB</span>
                            )}
                            {file.type !== 'application/pdf' && (
                              <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠ Not PDF</span>
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {selectedFiles.length > 5 && (
                    <p className="form__error-message" style={{ marginTop: '0.5rem' }}>
                      Maximum 5 files allowed. Please select fewer files.
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
                {isSubmitting ? 'Uploading...' : 'Upload Assignments'}
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
        )}

        {uploadedAssignments && uploadedAssignments.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Uploaded Assignments Summary</h2>
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              <p><strong>Total uploaded:</strong> {uploadedAssignments.length} assignment(s)</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Title</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>File Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Uploaded At</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{assignment.id}</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{assignment.title}</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{assignment.fileName}</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{assignment.category}</td>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: assignment.statusColor === 'gray' ? '#e0e0e0' :
                                            assignment.statusColor === 'orange' ? '#ffe0b2' :
                                            assignment.statusColor === 'green' ? '#c8e6c9' :
                                            assignment.statusColor === 'red' ? '#ffcdd2' :
                                            '#fff9c4',
                            color: assignment.statusColor === 'gray' ? '#424242' :
                                   assignment.statusColor === 'orange' ? '#e65100' :
                                   assignment.statusColor === 'green' ? '#2e7d32' :
                                   assignment.statusColor === 'red' ? '#c62828' :
                                   '#f57f17'
                          }}
                        >
                          {assignment.statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{formatDate(assignment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form__actions" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  setUploadedAssignments(null);
                  reset({
                    description: '',
                    category: 'ASSIGNMENT'
                  });
                  const fileInput = document.getElementById('files') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.value = '';
                  }
                }}
              >
                Upload More
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => navigate('/student/dashboard')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadAssignmentPage;
