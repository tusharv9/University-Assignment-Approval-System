import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAssignments,
  fetchAssignmentDetails,
  fetchProfessors,
  submitAssignment,
  Assignment,
  AssignmentsListQuery,
  Professor
} from '../../services/api';

type SortOrder = 'newest' | 'oldest';

const MyAssignmentsPage = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssignmentsListQuery['status']>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [assignmentToSubmit, setAssignmentToSubmit] = useState<Assignment | null>(null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
    loadProfessors();
  }, [statusFilter]);

  const loadProfessors = async () => {
    try {
      const response = await fetchProfessors();
      setProfessors(response.data.professors);
    } catch (err) {
      console.error('Error loading professors:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: AssignmentsListQuery = {
        limit: 1000 // Get all assignments for client-side sorting
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await fetchAssignments(params);
      setAssignments(response.data.assignments);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setError(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to load assignments'
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load assignments');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentClick = async (assignmentId: number) => {
    try {
      setDetailsLoading(true);
      const response = await fetchAssignmentDetails(assignmentId);
      setSelectedAssignment(response.data.assignment);
      setShowDetails(true);
    } catch (err) {
      console.error('Error loading assignment details:', err);
      // Still show basic info even if details fail
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        setSelectedAssignment(assignment);
        setShowDetails(true);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmitClick = (assignment: Assignment) => {
    setAssignmentToSubmit(assignment);
    setSelectedProfessorId('');
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowSubmitDialog(true);
  };

  const handleSubmitConfirm = async () => {
    if (!assignmentToSubmit || !selectedProfessorId) {
      setSubmitError('Please select a professor');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const response = await submitAssignment(assignmentToSubmit.id, {
        reviewerId: selectedProfessorId as number
      });

      setSubmitSuccess(response.message || 'Assignment submitted successfully');
      
      // Reload assignments to get updated status
      await loadAssignments();
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowSubmitDialog(false);
        setAssignmentToSubmit(null);
        setSelectedProfessorId('');
        setSubmitSuccess(null);
      }, 2000);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setSubmitError(
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'Failed to submit assignment'
        );
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to submit assignment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCancel = () => {
    setShowSubmitDialog(false);
    setAssignmentToSubmit(null);
    setSelectedProfessorId('');
    setSubmitError(null);
    setSubmitSuccess(null);
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

  // Sort assignments
  const sortedAssignments = [...assignments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  if (loading) {
    return (
      <div className="page">
        <div className="card">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card form__error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page__title">My Assignments</h1>
            <p className="page__subtitle">View and track all your submitted assignments</p>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => navigate('/student/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="statusFilter" className="form__label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Filter by Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AssignmentsListQuery['status'])}
              className="form__input form__select"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="sortOrder" className="form__label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Sort by Date
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="form__input form__select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="card">
        {sortedAssignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No assignments found.</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => navigate('/student/assignments/upload')}
              style={{ marginTop: '1rem' }}
            >
              Upload Your First Assignment
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Title</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Submitted Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Reviewer</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                    onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                  >
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{assignment.title}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {getCategoryLabel(assignment.category)}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
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
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {formatDate(assignment.createdAt)}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      {assignment.reviewer ? (
                        <div>
                          <div style={{ fontWeight: '500' }}>{assignment.reviewer.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>{assignment.reviewer.email}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {assignment.status === 'DRAFT' && (
                          <button
                            type="button"
                            className="button button--primary"
                            style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitClick(assignment);
                            }}
                          >
                            Submit for Review
                          </button>
                        )}
                        <button
                          type="button"
                          className="button button--ghost"
                          style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/assignments/${assignment.id}`);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Details Modal */}
      {showDetails && selectedAssignment && (
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
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowDetails(false)}
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
              <h2 style={{ margin: 0 }}>Assignment Details</h2>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem'
                }}
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <div>Loading details...</div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Title:</strong>
                  <p style={{ marginTop: '0.25rem' }}>{selectedAssignment.title}</p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <strong>Category:</strong>
                  <p style={{ marginTop: '0.25rem' }}>{getCategoryLabel(selectedAssignment.category)}</p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <strong>Status:</strong>
                  <p style={{ marginTop: '0.25rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          selectedAssignment.statusColor === 'gray'
                            ? '#e0e0e0'
                            : selectedAssignment.statusColor === 'orange'
                            ? '#ffe0b2'
                            : selectedAssignment.statusColor === 'green'
                            ? '#c8e6c9'
                            : selectedAssignment.statusColor === 'red'
                            ? '#ffcdd2'
                            : '#fff9c4',
                        color:
                          selectedAssignment.statusColor === 'gray'
                            ? '#424242'
                            : selectedAssignment.statusColor === 'orange'
                            ? '#e65100'
                            : selectedAssignment.statusColor === 'green'
                            ? '#2e7d32'
                            : selectedAssignment.statusColor === 'red'
                            ? '#c62828'
                            : '#f57f17'
                      }}
                    >
                      {selectedAssignment.statusLabel}
                    </span>
                  </p>
                </div>

                {selectedAssignment.description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Description:</strong>
                    <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedAssignment.description}</p>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <strong>Created Date:</strong>
                  <p style={{ marginTop: '0.25rem' }}>{formatDate(selectedAssignment.createdAt)}</p>
                </div>

                {selectedAssignment.submittedAt && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Submitted Date:</strong>
                    <p style={{ marginTop: '0.25rem' }}>{formatDate(selectedAssignment.submittedAt)}</p>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <strong>Reviewer:</strong>
                  <p style={{ marginTop: '0.25rem' }}>
                    {selectedAssignment.reviewer ? (
                      <div>
                        <div>{selectedAssignment.reviewer.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>{selectedAssignment.reviewer.email}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
                    )}
                  </p>
                </div>

                {selectedAssignment.filePath && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>File:</strong>
                    <p style={{ marginTop: '0.25rem' }}>
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/uploads/assignments/${selectedAssignment.filePath.split(/[\\/]/).pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#1976d2', textDecoration: 'underline' }}
                      >
                        Download PDF
                      </a>
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setShowDetails(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit for Review Dialog */}
      {showSubmitDialog && assignmentToSubmit && (
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
            zIndex: 1001,
            padding: '1rem'
          }}
          onClick={handleSubmitCancel}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Submit Assignment for Review</h2>
              <button
                type="button"
                onClick={handleSubmitCancel}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem'
                }}
              >
                ×
              </button>
            </div>

            {submitSuccess ? (
              <div>
                <div className="form__success" style={{ marginBottom: '1rem' }}>
                  <p>{submitSuccess}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleSubmitCancel}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <p><strong>Assignment:</strong> {assignmentToSubmit.title}</p>
                  <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Once submitted, you will not be able to edit this assignment.
                  </p>
                </div>

                <div className="form__group" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="professorSelect" className="form__label">
                    Select Professor <span className="form__required">*</span>
                  </label>
                  <select
                    id="professorSelect"
                    value={selectedProfessorId}
                    onChange={(e) => setSelectedProfessorId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="form__input form__select"
                    disabled={submitting}
                  >
                    <option value="">-- Select a professor --</option>
                    {professors.map((professor) => (
                      <option key={professor.id} value={professor.id}>
                        {professor.name} ({professor.email})
                      </option>
                    ))}
                  </select>
                  {professors.length === 0 && (
                    <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '0.5rem' }}>
                      No professors available in your department.
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="form__error" style={{ marginBottom: '1rem' }}>
                    <p>{submitError}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={handleSubmitCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleSubmitConfirm}
                    disabled={submitting || !selectedProfessorId || professors.length === 0}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Submission'}
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

export default MyAssignmentsPage;
