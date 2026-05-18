import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { modelTypes } from '../../data/marketplaceCards';

const FilterBar = ({ filteredCount, verticalName }) => {
  const { state, actions } = useAppContext();
  const { selectedModelFilter } = state;

  return (
    <div className="filter-bar">
      <h5>
        <i className="bi bi-funnel-fill"></i>
        Filter by Model Type
      </h5>
      
      <div className="filter-buttons">
        {modelTypes.map((type) => (
          <button
            key={type}
            className={`filter-btn ${selectedModelFilter === type ? 'active' : ''}`}
            onClick={() => actions.setModelFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>
      
      <small className="filter-count">
        Showing {filteredCount} use case(s)
        {verticalName !== 'Home' ? ` in ${verticalName}` : ''}
        {selectedModelFilter !== 'All Models' ? ` with ${selectedModelFilter}` : ''}
      </small>
    </div>
  );
};

export default FilterBar;
