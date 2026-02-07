import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchProfessorReviewAssignment,
  requestApproveOtp,
  verifyApprove,
  fetchAssignmentFileBlob,
  rejectProfessorAssignment,
  fetchForwardRecipients,
  forwardProfessorAssignment,
  ProfessorReviewAssignment,
  ForwardRecipient
} from '../../services/api';

type ApproveStep = 'idle' | 'signature' | 'otp_sent' | 'verifying' | 'success';

const ReviewAssignmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<ProfessorReviewAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [approveStep, setApproveStep] = useState<ApproveStep>('idle');
  const [otp, setOtp] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectSuccess, setRejectSuccess] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardRecipients, setForwardRecipients] = useState<ForwardRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | ''>('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  const assignmentId = id ? parseInt(id, 10) : NaN;

  useEffect(() => {
    if (!id || isNaN(assignmentId)) return;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchProfessorReviewAssignment(assignmentId);
        setAssignment(res.data.assignment);

        if (res.data.assignment.filePath) {
          const blob = await fetchAssignmentFileBlob(assignmentId);
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
        }
      } catch (err) {
        const msg =
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : 'Failed to load assignment';
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, assignmentId]);

  const handleDownload = async () => {
    if (isNaN(assignmentId)) return;
    try {
      const blob = await fetchAssignmentFileBlob(assignmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = assignment?.title?.replace(/[^a-zA-Z0-9.-]/g, '_') + '.pdf' || 'assignment.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setApproveError('Failed to download file');
    }
  };

  const handleRequestOtp = async () => {
    if (isNaN(assignmentId)) return;
    setApproveError(null);
    const sig = signature.trim() || (signatureImage || undefined);
    if (!sig) {
      setApproveError('Please enter your signature or upload an image.');
      return;
    }
    try {
      setApproveLoading(true);
      await requestApproveOtp(assignmentId, {
        remarks: remarks.trim() || undefined,
        signature: sig
      });
      setApproveStep('otp_sent');
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to send OTP';
      setApproveError(String(msg));
    } finally {
      setApproveLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isNaN(assignmentId) || !otp.trim()) {
      setApproveError('Please enter the OTP from your email.');
      return;
    }
    setApproveError(null);
    const sig = signature.trim() || (signatureImage || undefined);
    try {
      setApproveLoading(true);
      await verifyApprove(assignmentId, {
        otp: otp.trim(),
        remarks: remarks.trim() || undefined,
        signature: sig || undefined
      });
      setApproveStep('success');
      setTimeout(() => navigate('/professor/dashboard'), 2000);
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Invalid OTP or verification failed';
      setApproveError(String(msg));
    } finally {
      setApproveLoading(false);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRejectClick = () => {
    setRejectError(null);
    if (rejectFeedback.trim().length < 10) {
      setRejectError('Feedback is required and must be at least 10 characters.');
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleConfirmReject = async () => {
    if (isNaN(assignmentId) || rejectFeedback.trim().length < 10) return;
    setRejectError(null);
    try {
      setRejectLoading(true);
      await rejectProfessorAssignment(assignmentId, { remark: rejectFeedback.trim() });
      setRejectSuccess(true);
      setShowRejectConfirm(false);
      setTimeout(() => navigate('/professor/dashboard'), 2000);
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to reject assignment';
      setRejectError(String(msg));
    } finally {
      setRejectLoading(false);
    }
  };

  const handleForwardClick = async () => {
    setForwardError(null);
    setSelectedRecipientId('');
    setForwardNote('');
    setShowForwardModal(true);
    try {
      const res = await fetchForwardRecipients();
      setForwardRecipients(res.data.recipients);
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to load recipients';
      setForwardError(String(msg));
    }
  };

  const handleConfirmForward = async () => {
    if (isNaN(assignmentId) || selectedRecipientId === '') {
      setForwardError('Please select a recipient.');
      return;
    }
    setForwardError(null);
    try {
      setForwardLoading(true);
      await forwardProfessorAssignment(assignmentId, {
        newReviewerId: Number(selectedRecipientId),
        note: forwardNote.trim() || undefined
      });
      setForwardSuccess(true);
      setShowForwardModal(false);
      setTimeout(() => navigate('/professor/dashboard'), 2000);
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to forward assignment';
      setForwardError(String(msg));
    } finally {
      setForwardLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getCategoryLabel = (cat: string) =>
    ({ ASSIGNMENT: 'Assignment', THESIS: 'Thesis', REPORT: 'Report' }[cat] || cat);

  if (loading) return <div className="card">Loading assignment...</div>;
  if (error) return <div className="card form__error">{error}</div>;
  if (!assignment) return null;

  return (
    <div>
      <div className="page__header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page__title">Review Assignment</h1>
            <p className="page__subtitle">{assignment.title}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button--ghost"
              onClick={handleForwardClick}
            >
              Forward
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => navigate('/professor/dashboard')}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }} className="review-grid">
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Assignment details</h2>
          <p><strong>Student:</strong> {assignment.student.name} ({assignment.student.email})</p>
          <p><strong>Category:</strong> {getCategoryLabel(assignment.category)}</p>
          <p><strong>Submitted:</strong> {formatDate(assignment.submittedAt)}</p>
          {assignment.description && (
            <p><strong>Description:</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{assignment.description}</span></p>
          )}
          {assignment.filePath && (
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="button" onClick={handleDownload}>
                Download file
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>File preview</h2>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Assignment file"
              style={{
                width: '100%',
                height: '400px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
          ) : (
            <p style={{ color: '#64748b' }}>No file attached.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Remarks (optional)</h2>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add any remarks for the student or for records..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Reject assignment</h2>
        {rejectSuccess ? (
          <p style={{ color: 'green', fontWeight: 600 }}>Assignment rejected. The student has been notified. Redirecting...</p>
        ) : (
          <>
            <p style={{ marginBottom: '1rem' }}>Provide feedback for the student (required, at least 10 characters). They will see this and can resubmit after making improvements.</p>
            <textarea
              value={rejectFeedback}
              onChange={(e) => { setRejectFeedback(e.target.value); setRejectError(null); }}
              placeholder="Explain what needs to be improved..."
              rows={4}
              minLength={10}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              {rejectFeedback.length} characters (minimum 10)
            </p>
            {rejectError && <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>{rejectError}</p>}
            <button
              type="button"
              className="button"
              style={{ marginTop: '1rem', backgroundColor: '#dc2626' }}
              onClick={handleRejectClick}
              disabled={rejectLoading || rejectFeedback.trim().length < 10}
            >
              Reject assignment
            </button>
          </>
        )}
      </div>

      {showRejectConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => !rejectLoading && setShowRejectConfirm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '420px', margin: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Confirm rejection</h3>
            <p>Are you sure you want to reject this assignment? The student will receive your feedback and can resubmit.</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setShowRejectConfirm(false)}
                disabled={rejectLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button"
                style={{ backgroundColor: '#dc2626' }}
                onClick={handleConfirmReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Yes, reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForwardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => !forwardLoading && setShowForwardModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '440px', margin: '1rem', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Forward assignment</h3>
            <p style={{ marginBottom: '1rem' }}>Select a professor or HOD in your department to review this assignment. They will see it in their dashboard.</p>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form__label">Recipient</label>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value === '' ? '' : Number(e.target.value))}
                className="form__input"
                style={{ width: '100%' }}
              >
                <option value="">Select...</option>
                {forwardRecipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email}) – {r.role}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form__label">Forwarding note (optional)</label>
              <textarea
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                placeholder="Add a note for the new reviewer..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            {forwardError && <p style={{ color: '#dc2626', marginBottom: '0.5rem' }}>{forwardError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setShowForwardModal(false)}
                disabled={forwardLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button"
                onClick={handleConfirmForward}
                disabled={forwardLoading || selectedRecipientId === ''}
              >
                {forwardLoading ? 'Forwarding...' : 'Forward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardSuccess && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#ecfdf5', borderColor: '#10b981' }}>
          <p style={{ margin: 0, color: '#047857', fontWeight: 600 }}>Assignment forwarded. The new reviewer has been notified. Redirecting to dashboard...</p>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Approve assignment</h2>

        {approveStep === 'success' && (
          <p style={{ color: 'green', fontWeight: 600 }}>Assignment approved. Redirecting to dashboard...</p>
        )}

        {approveStep === 'signature' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <p>Enter your digital signature (text) or upload an image, then request an OTP to approve.</p>
            <div>
              <label className="form__label">Signature (text)</label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Your full name or signature text"
                className="form__input"
              />
            </div>
            <div>
              <label className="form__label">Or upload signature image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureFileChange}
                style={{ display: 'block', marginTop: '0.25rem' }}
              />
              {signatureImage && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={signatureImage} alt="Signature" style={{ maxHeight: 80, border: '1px solid #e2e8f0', borderRadius: 4 }} />
                  <button
                    type="button"
                    className="button button--ghost"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={() => setSignatureImage(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            {approveError && <p style={{ color: '#dc2626' }}>{approveError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="button"
                onClick={handleRequestOtp}
                disabled={approveLoading || (!signature.trim() && !signatureImage)}
              >
                {approveLoading ? 'Sending...' : 'Send OTP to my email'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => { setApproveStep('idle'); setApproveError(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {approveStep === 'otp_sent' && (
          <div style={{ maxWidth: '400px' }}>
            <p style={{ marginBottom: '1rem' }}>OTP has been sent to your email. Enter it below to complete approval.</p>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form__label">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                className="form__input"
                style={{ width: '120px', letterSpacing: '0.5em', fontSize: '1.25rem' }}
              />
            </div>
            {approveError && <p style={{ color: '#dc2626', marginBottom: '0.5rem' }}>{approveError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="button"
                onClick={handleVerify}
                disabled={approveLoading || otp.length !== 6}
              >
                {approveLoading ? 'Verifying...' : 'Verify and approve'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => { setApproveStep('signature'); setOtp(''); setApproveError(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {approveStep === 'idle' && (
          <button
            type="button"
            className="button"
            onClick={() => setApproveStep('signature')}
          >
            Approve assignment
          </button>
        )}
      </div>

    </div>
  );
};

export default ReviewAssignmentPage;
