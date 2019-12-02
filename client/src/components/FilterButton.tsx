import React, { ReactElement } from 'react';

type FilterButtonProps = {
  text: string;
  handleClick?: () => void;
};

const FilterButton: React.FC<FilterButtonProps> = ({ text, handleClick }) => (
  <button className="filter-base filter-button" onClick={handleClick}>
    {text}
  </button>
);

export default FilterButton;
