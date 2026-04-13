import React from 'react';
import UseCaseCard from './UseCaseCard';

const CardGrid = ({ cards }) => {
  if (cards.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#ccc' }}></i>
        <p className="text-muted mt-3">No use cases found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <UseCaseCard key={card.id} card={card} />
      ))}
    </div>
  );
};

export default CardGrid;
