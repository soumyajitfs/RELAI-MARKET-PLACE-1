import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const UnderDevelopmentPage = () => {
  const navigate = useNavigate();
  const { cardTitle } = useParams();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="under-development-page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleBack}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <div className="under-development">
        <h1>🚧</h1>
        <h2>Under Development</h2>
        
        <div 
          className="alert" 
          style={{
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '12px',
            padding: '16px 24px',
            margin: '24px auto',
            maxWidth: '500px'
          }}
        >
          The <strong>{cardTitle || 'selected use case'}</strong> prototype is currently under development.
        </div>
        
        <p style={{ color: '#666' }}>Please check back later for updates!</p>
      </div>

      {/* Planned Features Card */}
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          marginTop: '32px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px 24px'
          }}
        >
          <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-clipboard-check"></i>
            Planned Features
          </h5>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '2' }}>
            <li><strong>Data Integration:</strong> Connect to various data sources</li>
            <li><strong>Model Training:</strong> Implement machine learning algorithms</li>
            <li><strong>Dashboard:</strong> Interactive visualizations and insights</li>
            <li><strong>Reporting:</strong> Automated report generation</li>
          </ul>
        </div>
      </div>

      {/* Progress Card */}
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          marginTop: '16px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            background: 'linear-gradient(135deg, #1E2247 0%, #2A2F5D 100%)',
            color: 'white',
            padding: '16px 24px'
          }}
        >
          <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-hourglass-split"></i>
            Development Progress
          </h5>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div 
            style={{
              background: '#e9ecef',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '24px'
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                width: '30%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              30%
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#666' }}>
            Development in progress...
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopmentPage;
