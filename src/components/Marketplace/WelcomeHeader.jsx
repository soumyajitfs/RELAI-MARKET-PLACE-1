import React from 'react';

const WelcomeHeader = () => {
  return (
    <div className="welcome-header">
      <h1>
        Welcome to <span className="text-purple">relAI</span> - AI Marketplace
      </h1>
      <p className="welcome-subtitle">
        A one stop view for all the AI Models for your business needs.
      </p>
      <div className="welcome-tagline">
        <span className="purple">Explore.</span>
        <span className="orange">Experience.</span>
        <span className="dark-blue">Execute.</span>
      </div>
    </div>
  );
};

export default WelcomeHeader;
