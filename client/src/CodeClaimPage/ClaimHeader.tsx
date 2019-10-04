import React from 'react';

/* Assets */
import Star from '../images/white-star.svg';
import HeaderShadow from '../images/header-shadow-desktop-white.svg';


/*
* @dev: Common header for QR claim system
* */
const ClaimHeader: React.FC<{title: string, image?: string, claimed?: boolean}> = ({title, image, claimed=true}) => {
  return (
    <div className={'claim-header'}>
      <div className={'title'}>{title}</div>
      <div className={'logo-event'}>
        {image && <img src={image} alt="Event" />}
        {claimed &&
        <div className={'claimed-badge'}>
          <img src={Star} alt={"Badge claimed"} />
        </div>
        }
      </div>
      <div className={'wave-holder'}>
        <img src={HeaderShadow} alt={''} />
      </div>
    </div>
  )
};

export default ClaimHeader;