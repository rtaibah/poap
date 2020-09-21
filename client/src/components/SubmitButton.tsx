import React, { CSSProperties } from 'react';
import classNames from 'classnames';
export const SubmitButton: React.FC<{
  text: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  style?: CSSProperties;
}> = ({ isSubmitting, canSubmit, text, style }) => (
  <button
    className={classNames('btn', isSubmitting && 'loading')}
    type="submit"
    style={style}
    disabled={isSubmitting || !canSubmit}
  >
    {isSubmitting ? '' : text}
  </button>
);
