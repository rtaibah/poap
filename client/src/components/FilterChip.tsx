import React from 'react';

type FilterChipProps = {
  text: string;
  isActive: boolean;
  handleOnClick: () => void;
};

const FilterChip: React.FC<FilterChipProps> = ({ text, isActive, handleOnClick }) => {
  return (
    <button className={`filter-chip ${isActive && 'active'}`} onClick={handleOnClick}>
      {text}
    </button>
  );
};

export default FilterChip;
