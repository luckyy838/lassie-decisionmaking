import * as React from 'react';

export default function Complete() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f7f8',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '560px', textAlign: 'center', color: '#114B5F' }}>
        <h1>Thank you</h1>
        <p>Thank you for your responses! You have completed this survey.</p>
        <p>Your responses have been recorded. You can close this page.</p>
      </div>
    </div>
  );
}
