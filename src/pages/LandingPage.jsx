import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import WelcomeHeader from '../components/Marketplace/WelcomeHeader';
import FilterBar from '../components/Marketplace/FilterBar';
import CardGrid from '../components/Marketplace/CardGrid';
import marketplaceCards from '../data/marketplaceCards';

const LandingPage = () => {
  const { state } = useAppContext();
  const { selectedVertical, selectedModelFilter } = state;

  // Filter cards based on vertical and model type
  const filteredCards = useMemo(() => {
    return marketplaceCards.filter(card => {
      // Vertical filter
      const verticalMatch = selectedVertical === 'Home' || card.vertical === selectedVertical;
      
      // Model type filter
      const modelMatch = selectedModelFilter === 'All Models' || card.modelType === selectedModelFilter;
      
      return verticalMatch && modelMatch;
    });
  }, [selectedVertical, selectedModelFilter]);

  return (
    <div className="landing-page">
      {/* Welcome Header - shown on all verticals for consistent top layout */}
      <WelcomeHeader />
      
      {/* Filter Bar */}
      <FilterBar 
        filteredCount={filteredCards.length}
        verticalName={selectedVertical}
      />
      
      {/* Card Grid */}
      <CardGrid cards={filteredCards} />
    </div>
  );
};

export default LandingPage;
