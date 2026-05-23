import { useState, useEffect } from 'react';

interface SmsModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSend: (number: string, message: string) => Promise<void>;
  isSending: boolean;
}

export default function SmsModal({ isOpen, onCancel, onSend, isSending }: SmsModalProps) {
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');

  // Clear inputs when opening/closing
  useEffect(() => {
    if (isOpen) {
      setNumber('');
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !message.trim()) return;
    onSend(number.trim(), message.trim());
  };

  const charCount = message.length;
  // standard SMS is 160 chars, but Unicode SMS (UCS-2) is 70 characters per SMS segment
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 70);

  return (
    <div className={`fullscreen-overlay ${isOpen ? 'active' : ''}`}>
      <div className="overlay-card" style={{ maxWidth: '480px' }}>
        <h2 className="overlay-title">💬 Compose SMS</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '-0.5rem' }}>
          Send text message through the router SIM card
        </p>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="smsNumber">Phone Number</label>
            <input
              type="tel"
              id="smsNumber"
              className="form-input"
              placeholder="e.g. +905551234567"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              disabled={isSending}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="smsMessage">Message</label>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {charCount} chars ({smsSegments} SMS)
              </span>
            </div>
            <textarea
              id="smsMessage"
              className="form-input"
              placeholder="Type your message here..."
              rows={4}
              style={{ resize: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              maxLength={300}
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSending || !number.trim() || !message.trim()}
              style={{
                background: isSending
                  ? 'var(--border)'
                  : 'linear-gradient(135deg, var(--accent-primary), #3b82f6)',
              }}
            >
              {isSending ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
