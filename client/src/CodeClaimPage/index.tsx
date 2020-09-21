import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import Web3 from 'web3';
import { useToasts } from 'react-toast-notifications';

/* Helpers */
import { HashClaim, getClaimHash, getTokensFor } from '../api';

/* Components*/
import ClaimHeader from './ClaimHeader';
import QRHashForm from './QRHashForm';
import ClaimLoading from './ClaimLoading';
import ClaimForm from './ClaimForm';
import ClaimPending from './ClaimPending';
import ClaimFinished from './ClaimFinished';
import ClaimBumped from './ClaimBumped';
import ClaimDelegated from './ClaimDelegated';
import { TemplateClaimLoading } from './templateClaim/TemplateClaimLoading';
import { ClaimFooter } from '../components/ClaimFooter';

/* Constants */
import { TX_STATUS } from '../lib/constants';

/* Assets */
import abi from '../abis/PoapDelegatedMint.json';
import EmptyBadge from '../images/empty-badge.svg';
import { TemplateClaimFooter } from './templateClaim/TemplateClaimFooter';
import { TemplateClaimHeader } from './templateClaim/TemplateClaimHeader';

const NETWORK = process.env.REACT_APP_ETH_NETWORK;

export const CodeClaimPage: React.FC<RouteComponentProps<{ hash: string; method: string }>> = ({
  match,
}) => {
  const [claim, setClaim] = useState<null | HashClaim>(null);
  const [claimError, setClaimError] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [initialStep, setInitialStep] = useState<boolean>(true);
  const [isClaimLoading, setIsClaimLoading] = useState<boolean>(false);
  const [beneficiaryHasToken, setBeneficiaryHasToken] = useState<boolean>(false);

  const { addToast } = useToasts();

  let { hash, method } = match.params;
  let title = 'POAP Claim';
  let image = EmptyBadge;

  useEffect(() => {
    if (hash) fetchClaim(hash);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (claim && claim.delegated_mint && !isVerified) {
      verifySignedMessage();
    }
  }, [claim]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchClaim = (hash: string) => {
    setIsClaimLoading(true);
    getClaimHash(hash.toLowerCase())
      .then((claim) => {
        setClaim(claim);
        setClaimError(false);
      })
      .catch((error) => {
        setClaimError(true);
      })
      .finally(() => setIsClaimLoading(false));
  };

  const continueClaim = (claim: HashClaim) => {
    setClaim(claim);
    setInitialStep(false);
  };

  const checkUserTokens = () => {
    if (!claim || !claim.beneficiary) return;
    getTokensFor(claim.beneficiary).then((tokens) => {
      const hasToken = tokens.filter((token) => token.event.id === claim.event_id).length > 0;
      if (hasToken) {
        setBeneficiaryHasToken(true);
      }
    });
  };

  const verifySignedMessage = async () => {
    if (!claim || !claim.delegated_signed_message || networkError) return;

    // Initiate the contract and check if the message was processed
    const web3 = new Web3(Web3.givenProvider || process.env.REACT_APP_INFURA_PROVIDER);
    const network = await web3.eth.net.getNetworkType();

    if (NETWORK && network && NETWORK.indexOf(network) === -1) {
      let message = `Wrong network, please connect to ${NETWORK}.\nCurrently on ${network}`;
      addToast(message, {
        appearance: 'error',
        autoDismiss: false,
      });
      setNetworkError(true);
      setIsVerified(true);
      return;
    }

    const contract = new web3.eth.Contract(
      abi as any,
      process.env.REACT_APP_MINT_DELEGATE_CONTRACT
    );
    contract.methods
      .processed(claim.delegated_signed_message)
      .call()
      .then((processed: boolean) => {
        if (processed) setBeneficiaryHasToken(processed);
      })
      .catch(() => {
        checkUserTokens();
      })
      .finally(() => {
        setIsVerified(true);
      });
  };

  let body = <QRHashForm loading={isClaimLoading} checkClaim={fetchClaim} error={claimError} />;

  if (claim) {
    body = <ClaimForm claim={claim} onSubmit={continueClaim} method={method} />;

    title = claim.event.name;
    if (claim.event.image_url) {
      image = claim.event.image_url;
    }
    if (claim.claimed) {
      // Delegated minting
      if (claim.delegated_mint) {
        body = (
          <ClaimDelegated
            claim={claim}
            verifyClaim={verifySignedMessage}
            initialStep={initialStep}
          />
        );
      }

      // POAP minting
      if (claim.tx_status && claim.tx_status === TX_STATUS.pending) {
        body = <ClaimPending claim={claim} checkClaim={fetchClaim} />;
      }
      if ((claim.tx_status && claim.tx_status === TX_STATUS.passed) || beneficiaryHasToken) {
        body = <ClaimFinished claim={claim} />;
      }
      if (claim.tx_status && claim.tx_status === TX_STATUS.bumped) {
        body = <ClaimBumped claim={claim} />;
      }
    }
  }

  if ((hash && !claim && !claimError) || (claim && claim.delegated_signed_message && !isVerified)) {
    body = <ClaimLoading />;
  }

  return (
    <>
      {hash && !claim && !claimError ? (
        <TemplateClaimLoading />
      ) : (
        <div className={'code-claim-page claim'}>
          {!claim?.event_template ? (
            <ClaimHeader
              title={title}
              image={image}
              claimed={!!(claim && (claim.tx_status === TX_STATUS.passed || beneficiaryHasToken))}
            />
          ) : (
            <TemplateClaimHeader
              title={title}
              image={image}
              claimed={!!(claim && (claim.tx_status === TX_STATUS.passed || beneficiaryHasToken))}
              claim={claim}
            />
          )}

          <div className={`claim-body ${claim?.event_template ? 'template' : ''}`}>{body}</div>
          {!claim?.event_template ? <ClaimFooter /> : <TemplateClaimFooter claim={claim} />}
        </div>
      )}
    </>
  );
};
