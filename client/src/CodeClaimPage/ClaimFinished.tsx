import React from 'react';

/* Helpers */
import { HashClaim } from '../api';

/* Components */
import { LinkButton } from '../components/LinkButton';

/*
* @dev: Component to show minted token
* */
const ClaimFinished: React.FC<{claim: HashClaim}> = ({claim}) => {
  const appLink = `/scan/${claim.beneficiary}`;
  return (
    <div className={'claim-info'} data-aos="fade-up" data-aos-delay="300">
      <div className={'info-title'}>
        Congratulations! <br/>
        {claim.event.name} badge is now in your wallet
      </div>
      <div className={'text-info'}>
        Keep growing your POAP collection!
      </div>
      <LinkButton
        text={'Check my badges'}
        link={appLink}
        extraClass={'link-btn'} />
    </div>
  )
};

export default ClaimFinished;