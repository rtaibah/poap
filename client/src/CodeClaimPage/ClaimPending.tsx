import React, { useEffect } from 'react';

/* Helpers */
import { HashClaim } from '../api';

/* Components */
import { LinkButton } from '../components/LinkButton';

/* Assets */
import Spinner from '../images/etherscan-spinner.svg';

/*
 * @dev: Component to show user that transactions is being mined
 * */
const ClaimPending: React.FC<{ claim: HashClaim; checkClaim: (hash: string) => void }> = ({
  claim,
  checkClaim,
}) => {
  const etherscanLink = `https://etherscan.io/tx/${claim.tx_hash}`;

  useEffect(() => {
    const interval = setInterval(() => {
      checkClaim(claim.qr_hash);
    }, 10000);
    return () => clearInterval(interval);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className={'claim-info'} data-aos="fade-up" data-aos-delay="300">
      <div className={'info-title'}>Your badge is on it's way to your wallet</div>
      <div className={'info-pending'}>
        <img src={Spinner} alt={'Mining'} />
        Pending
      </div>
      <div className={'text-info'}>
        Come back im a few minutes to check the status, or follow the transaction on Etherscan
      </div>
      <LinkButton
        text={'View on Etherscan'}
        link={etherscanLink}
        extraClass={'link-btn'}
        target={'_blank'}
      />
    </div>
  );
};

export default ClaimPending;
