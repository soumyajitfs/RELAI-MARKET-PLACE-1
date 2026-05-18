import React from 'react';

const CustomerLifecycleSubCard = ({
  title,
  description,
  problemType,
  isSelected,
  onViewClick
}) => (
  <div
    className={`marketplace-card lifecycle-sub-card ${isSelected ? 'lifecycle-sub-card-selected' : ''}`}
    aria-current={isSelected ? 'true' : undefined}
    data-selected={isSelected ? 'true' : undefined}
  >
    <div className="card-header">
      <h5>{title}</h5>
    </div>
    <div className="card-body lifecycle-sub-card-body">
      <div className="description-box">{description}</div>
      <div className="card-footer-content">
        <span className="problem-type-badge">{problemType}</span>
        <button
          type="button"
          className="view-btn enabled"
          onClick={(e) => {
            e.stopPropagation();
            onViewClick();
          }}
        >
          View
        </button>
      </div>
    </div>
  </div>
);

export default CustomerLifecycleSubCard;
