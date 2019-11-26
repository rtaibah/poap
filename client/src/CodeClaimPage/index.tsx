import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';

/* Helpers */
import { HashClaim, getClaimHash } from '../api';
import { hasWeb3 } from '../poap-eth';

/* Components*/
import ClaimHeader from './ClaimHeader';
import QRHashForm from './QRHashForm';
import ClaimLoading from './ClaimLoading';
import ClaimForm from './ClaimForm';
import ClaimPending from './ClaimPending';
import ClaimFinished from './ClaimFinished';
import { ClaimFooter } from '../components/ClaimFooter';

/* Constants */
import { TX_STATUS } from '../lib/constants';

/* Assets */
import EmptyBadge from '../images/empty-badge.svg';

export const CodeClaimPage: React.FC<RouteComponentProps<{ hash: string }>> = ({ match }) => {
  const [web3, setWeb3] = useState<boolean | null>(null);
  const [claim, setClaim] = useState<null | HashClaim>(null);
  const [claimError, setClaimError] = useState<boolean>(false);
  const [isClaimLoading, setIsClaimLoading] = useState<boolean>(false);
  let { hash } = match.params;
  let title = 'POAP Claim';
  let image = EmptyBadge;

  useEffect(() => {
    hasWeb3().then(setWeb3);
    if (hash) fetchClaim(hash);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchClaim = (hash: string) => {
    setIsClaimLoading(true);
    getClaimHash(hash.toLowerCase())
      .then(claim => {
        setClaim(claim);
        setClaimError(false);
      })
      .catch(error => {
        console.error(error);
        setClaimError(true);
      })
      .finally(() => setIsClaimLoading(false));
  };

  let body = <QRHashForm loading={isClaimLoading} checkClaim={fetchClaim} error={claimError} />;
  if (claim) {
    body = <ClaimForm enabledWeb3={web3} claim={claim} checkClaim={fetchClaim} />;
    title = claim.event.name;
    image = claim.event.image_url;
    if (claim.tx_status) {
      if (claim.tx_status === TX_STATUS.pending) {
        body = <ClaimPending claim={claim} checkClaim={fetchClaim} />;
      }
      if (claim.tx_status === TX_STATUS.passed) {
        body = <ClaimFinished claim={claim} />;
      }
    }
  }

  if (hash && !claim && !claimError) {
    body = <ClaimLoading />;
  }

  return (
    <div className={'code-claim-page'}>
      <ClaimHeader
        title={title}
        image={image}
        claimed={!!(claim && claim.tx_status === TX_STATUS.passed)}
      />
      <div className={'claim-body'}>{body}</div>
      <ClaimFooter />
    </div>
  );
};
