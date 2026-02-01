import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAssignmentDetails, resubmitAssignment, AssignmentDetailResponse } from '../../services/api';

const AssignmentDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentDetailResponse['data']['assignment'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [resubmitDescription, setResubmitDescription] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAssignmentDetails();
    }
  }, [id]);

  const loadAssignmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchAssignmentDetails(parseInt(id!, 10));
      setAssignment(response.data.assignment);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setError(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to load assignment details'
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load assignment details');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      ASSIGNMENT: 'Assignment',
      THESIS: 'Thesis',
      REPORT: 'Report'
    };
    return labels[category] || category;
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      SUBMITTED: 'Submitted for Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      PENDING: 'Pending Review',
      RETURNED: 'Returned for Revision'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      SUBMITTED: '#ff9800',
      APPROVED: '#4caf50',
      REJECTED: '#f44336',
      PENDING: '#ffc107',
      RETURNED: '#2196f3'
    };
    return colors[action] || '#757575';
  };

  const handleDownload = () => {
    if (assignment?.filePath) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      window.open(`${apiUrl}/student/assignments/${assignment.id}/download`, '_blank');
    }
  };

  const getRejectionRemark = (): string | null => {
    if (!assignment?.history) return null;
    const rejectionEntry = assignment.history
      .slice()
      .reverse()
      .find((entry) => entry.action === 'REJECTED');
    return rejectionEntry?.remark || null;
  };

  const handleResubmit = async () => {
    if (!assignment) return;

    try {
      setResubmitting(true);
      setResubmitError(null);
      setResubmitSuccess(null);

      const response = await resubmitAssignment(assignment.id, {
        description: resubmitDescription || undefined,
        file: resubmitFile || undefined
      });

      setResubmitSuccess(response.message || 'Assignment resubmitted successfully');
      
      // Reload assignment details
      await loadAssignmentDetails();
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowResubmitDialog(false);
        setResubmitDescription('');
        setResubmitFile(null);
        setResubmitSuccess(null);
      }, 2000);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setResubmitError(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to resubmit assignment'
        );
      } else if (err instanceof Error) {
        setResubmitError(err.message);
      } else {
        setResubmitError('Failed to resubmit assignment. Please try again.');
      }
    } finally {
      setResubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">Loading assignment details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card form__error">
          <p>{error}</p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => navigate('/student/assignments')}
            style={{ marginTop: '1rem' }}
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="page">
        <div className="card">
          <p>Assignment not found</p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => navigate('/student/assignments')}
            style={{ marginTop: '1rem' }}
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page__title">Assignment Details</h1>
            <p className="page__subtitle">{assignment.title}</p>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => navigate('/student/assignments')}
          >
            Back to Assignments
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Assignment Information */}
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Assignment Information</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Title:</strong>
            <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>{assignment.title}</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Category:</strong>
            <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>{getCategoryLabel(assignment.category)}</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Status:</strong>
            <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor:
                    assignment.statusColor === 'gray'
                      ? '#e0e0e0'
                      : assignment.statusColor === 'orange'
                      ? '#ffe0b2'
                      : assignment.statusColor === 'green'
                      ? '#c8e6c9'
                      : assignment.statusColor === 'red'
                      ? '#ffcdd2'
                      : '#fff9c4',
                  color:
                    assignment.statusColor === 'gray'
                      ? '#424242'
                      : assignment.statusColor === 'orange'
                      ? '#e65100'
                      : assignment.statusColor === 'green'
                      ? '#2e7d32'
                      : assignment.statusColor === 'red'
                      ? '#c62828'
                      : '#f57f17'
                }}
              >
                {assignment.statusLabel}
              </span>
            </p>
          </div>

          {assignment.description && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Description:</strong>
              <p style={{ marginTop: '0.25rem', marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <strong>Created Date:</strong>
            <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>{formatDate(assignment.createdAt)}</p>
          </div>

          {assignment.submittedAt && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Submitted Date:</strong>
              <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>{formatDate(assignment.submittedAt)}</p>
            </div>
          )}

          {assignment.reviewer && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Current Reviewer:</strong>
              <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                <div>{assignment.reviewer.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {assignment.reviewer.email} ({assignment.reviewer.role})
                </div>
              </p>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {assignment.filePath && (
              <button
                type="button"
                className="button button--primary"
                onClick={handleDownload}
              >
                Download Original File
              </button>
            )}
            {assignment.status === 'REJECTED' && (
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  setShowResubmitDialog(true);
                  setResubmitDescription(assignment.description || '');
                  setResubmitFile(null);
                  setResubmitError(null);
                  setResubmitSuccess(null);
                }}
              >
                Resubmit Assignment
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Approval History</h2>
          
          {assignment.history && assignment.history.length > 0 ? (
            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '15px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  backgroundColor: '#e0e0e0'
                }}
              />
              
              {assignment.history.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    position: 'relative',
                    paddingLeft: '2.5rem',
                    marginBottom: index < assignment.history.length - 1 ? '2rem' : '0',
                    paddingBottom: index < assignment.history.length - 1 ? '2rem' : '0'
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: getActionColor(entry.action),
                      border: '3px solid white',
                      boxShadow: '0 0 0 2px ' + getActionColor(entry.action),
                      zIndex: 1
                    }}
                  />
                  
                  {/* Entry content */}
                  <div
                    style={{
                      backgroundColor: '#f9f9f9',
                      padding: '1rem',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ color: getActionColor(entry.action) }}>
                          {getActionLabel(entry.action)}
                        </strong>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                          by {entry.reviewer.name} ({entry.reviewer.role})
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666', textAlign: 'right' }}>
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    
                    {entry.remark && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0' }}>
                        <strong style={{ fontSize: '0.875rem' }}>Remark:</strong>
                        <p style={{ marginTop: '0.25rem', marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {entry.remark}
                        </p>
                      </div>
                    )}
                    
                    {entry.signature && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0' }}>
                        <strong style={{ fontSize: '0.875rem' }}>Signature:</strong>
                        <p style={{ marginTop: '0.25rem', marginBottom: 0, fontStyle: 'italic' }}>
                          {entry.signature}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              <p>No history available yet.</p>
              {assignment.status === 'DRAFT' && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Submit this assignment to start the review process.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resubmit Dialog */}
      {showResubmitDialog && assignment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
            padding: '1rem'
          }}
          onClick={() => !resubmitting && setShowResubmitDialog(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Resubmit Assignment</h2>
              <button
                type="button"
                onClick={() => !resubmitting && setShowResubmitDialog(false)}
                disabled={resubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: resubmitting ? 'not-allowed' : 'pointer',
                  padding: '0.25rem 0.5rem',
                  opacity: resubmitting ? 0.5 : 1
                }}
              >
                ×
              </button>
            </div>

            {resubmitSuccess ? (
              <div>
                <div className="form__success" style={{ marginBottom: '1rem' }}>
                  <p>{resubmitSuccess}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => setShowResubmitDialog(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p><strong>Assignment:</strong> {assignment.title}</p>
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    You can update the description and/or upload a new file. Leave fields unchanged to keep existing values.
                  </p>
                </div>

                {/* Show Rejection Remarks */}
                {getRejectionRemark() && (
                  <div
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px'
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#856404' }}>
                      Rejection Feedback:
                    </strong>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#856404' }}>
                      {getRejectionRemark()}
                    </p>
                  </div>
                )}

                <div className="form__group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="resubmitDescription" className="form__label">
                    Description (optional)
                  </label>
                  <textarea
                    id="resubmitDescription"
                    value={resubmitDescription}
                    onChange={(e) => setResubmitDescription(e.target.value)}
                    className="form__input form__textarea"
                    placeholder="Update assignment description (leave empty to keep current)"
                    rows={4}
                    disabled={resubmitting}
                  />
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Leave empty to keep the current description
                  </p>
                </div>

                <div className="form__group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="resubmitFile" className="form__label">
                    New File (optional, PDF only, max 10MB)
                  </label>
                  <input
                    type="file"
                    id="resubmitFile"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf') {
                          setResubmitError('Only PDF files are allowed');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          setResubmitError('File size must be less than 10MB');
                          return;
                        }
                        setResubmitFile(file);
                        setResubmitError(null);
                      }
                    }}
                    className="form__input form__file"
                    disabled={resubmitting}
                  />
                  {resubmitFile && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      <p style={{ margin: 0 }}>
                        <strong>Selected:</strong> {resubmitFile.name} ({formatFileSize(resubmitFile.size)})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setResubmitFile(null);
                          const input = document.getElementById('resubmitFile') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.875rem',
                          padding: '0.25rem 0.5rem',
                          background: 'none',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        disabled={resubmitting}
                      >
                        Remove File
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Leave empty to keep the current file
                  </p>
                </div>

                {resubmitError && (
                  <div className="form__error" style={{ marginBottom: '1rem' }}>
                    <p>{resubmitError}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setShowResubmitDialog(false)}
                    disabled={resubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleResubmit}
                    disabled={resubmitting}
                  >
                    {resubmitting ? 'Resubmitting...' : 'Resubmit Assignment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetailsPage;
