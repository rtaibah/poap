import React, { FC, useCallback, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { Formik, FormikActions, Form, Field, FieldProps, ErrorMessage } from 'formik';

import { HashClaim, getClaimHash, postClaimHash } from '../api';
import { AddressSchema } from '../lib/schemas';
import { tryGetAccount, tryObtainBadge, hasMetamask, isMetamaskLogged } from '../poap-eth';
import { useAsync, useBodyClassName } from '../react-helpers';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { LinkButton } from '../components/LinkButton';
import { ClaimFooter } from '../components/ClaimFooter';
import { Loading } from '../components/Loading';
import ClaimHashForm from './ClaimHashForm';
// import { LoadEvent } from '../SignerClaimPage';

/* Constants */
import { TX_STATUS } from '../lib/constants';

/* Assets */
import HeaderShadow from '../images/header-shadow-desktop-white.svg';
import EmptyBadge from '../images/empty-badge.svg';
import Star from '../images/white-star.svg';
import Spinner from '../images/etherscan-spinner.svg';

type QRFormValues = {
  address: string;
};

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
        <img src={HeaderShadow} />
      </div>
    </div>
  )
};

const ClaimForm: React.FC<{claim: HashClaim, checkClaim: (hash: string) => void}> = ({claim, checkClaim}) => {

  const handleFormSubmit = async (
    values: QRFormValues,
    actions: FormikActions<QRFormValues>
  ) => {
    try {
      actions.setSubmitting(true);
      await postClaimHash(claim.qr_hash, values.address, claim.secret);
      checkClaim(claim.qr_hash);
    } catch (error) {
      actions.setStatus({ ok: false, msg: `Badge couldn't be minted` });
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <div className={'container'}>
      <div>
        <Formik
          enableReinitialize
          onSubmit={handleFormSubmit}
          initialValues={{ address: '' }}
          validationSchema={AddressSchema}
        >
          {({ dirty, isValid, isSubmitting, status, touched }) => {
            return (
              <Form className="claim-form">
                <Field
                  name="address"
                  render={({ field, form }: FieldProps) => {
                    return (
                      <input
                        type="text"
                        autoComplete="off"
                        className={classNames(!!form.errors[field.name] && 'error')}
                        placeholder={'Paste your Address or ENS'}
                        {...field}
                      />
                    );
                  }}
                />
                <ErrorMessage name="gasPrice" component="p" className="bk-error"/>
                {status && (
                  <p className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</p>
                )}
                <div className={'web3-browser'}>
                  Web3 browser? <span>Get my address</span>
                </div>
                <SubmitButton
                  text="Claim my badge"
                  isSubmitting={isSubmitting}
                  canSubmit={isValid && dirty}
                />
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  )
};

const PendingClaim: React.FC<{claim: HashClaim}> = ({claim}) => {
  const etherscanLink = `https://etherscan.io/tx/${claim.tx_hash}`;
  return (
    <div className={'claim-info'}>
      <div className={'info-title'}>
        Your badge is on it's way to your wallet
      </div>
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
        target={'_blank'} />
    </div>
  )
};

const FinishedClaim: React.FC<{claim: HashClaim}> = ({claim}) => {
  const appLink = `/scan/${claim.beneficiary}`;
  return (
    <div className={'claim-info'}>
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

export const CodeClaimPage: React.FC<RouteComponentProps<{ hash: string }>> = ({ match }) => {
  const [claim, setClaim] = useState<null | HashClaim>(null);
  const [claimError, setClaimError] = useState<boolean>(false);
  const [isClaimLoading, setIsClaimLoading] = useState<boolean>(false);
  let { hash } = match.params;
  let title = 'POAP Claim';
  let image = EmptyBadge;

  useEffect(() => {
    if (hash) fetchClaim(hash);
  }, []);

  const fetchClaim = (hash: string) => {
    setIsClaimLoading(true);
    getClaimHash(hash)
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

  let body = <ClaimHashForm loading={isClaimLoading} checkClaim={fetchClaim} error={claimError} />;
  if (claim) {
    body = <ClaimForm claim={claim} checkClaim={fetchClaim} />;
    title = claim.event.name;
    image = claim.event.image_url;
    if (claim.tx_status) {
      if (claim.tx_status === TX_STATUS.pending) {
        body = <PendingClaim claim={claim} />
      }
      if (claim.tx_status === TX_STATUS.passed) {
        body = <FinishedClaim claim={claim} />
      }
    }
  }

  return (
    <div className={'code-claim-page'}>
      <ClaimHeader title={title} image={image} claimed={!!(claim && claim.tx_status === TX_STATUS.passed)} />
      <div className={'claim-body'}>
        {body}
      </div>
      <ClaimFooter />
    </div>
  );
};

/**

1) Cargo... todavia no se si tengo web3 [ Detecting web3...]
2) Espero a ver si tengo web3 (3 segundos)
3) Si es Metmask => Pido enable() (en el claimer)
4) Si no es metamask => Pido first account y la uso
5) Si no tengo nada => muestro mensaje de error

post (3) y (4)


Estados:
  - CheckingWeb3
  - WalletReady
  - MintingToken
  - WalletMissing
 */
