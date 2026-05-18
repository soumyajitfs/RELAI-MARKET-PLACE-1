import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const UseCaseCard = ({ card }) => {
  const navigate = useNavigate();
  const { actions } = useAppContext();
  const { title, description, modelType, enabled, route } = card;

  const handleClick = () => {
    if (enabled && route) {
      navigate(route);
    } else {
      actions.showToast({
        message: `${title} is under development`,
        type: 'warning'
      });
    }
  };

  return (
    <div 
      className={`marketplace-card ${!enabled ? 'disabled' : ''}`}
      onClick={handleClick}
    >
      {/* Card Header */}
      <div className="card-header">
        <h5>{title}</h5>
      </div>
      
      {/* Card Body */}
      <div className="card-body">
        {/* Description */}
        <div className="description-box">
          {description}
        </div>
        
        {/* Footer */}
        <div className="card-footer-content">
          <span className="model-badge">{modelType}</span>
          <button 
            className={`view-btn ${enabled ? 'enabled' : 'disabled'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default UseCaseCard;
