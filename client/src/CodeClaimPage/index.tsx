import React, { FC, useCallback, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { Formik, FormikActions, Form, Field, FieldProps, ErrorMessage } from 'formik';

import { HashClaim, getEvent, PoapEvent, checkSigner } from '../api';
import { AddressSchema } from '../lib/schemas';
import { tryGetAccount, tryObtainBadge, hasMetamask, isMetamaskLogged } from '../poap-eth';
import { useAsync, useBodyClassName } from '../react-helpers';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { ClaimFooter } from '../components/ClaimFooter';
import { Loading } from '../components/Loading';
import ClaimHashForm from './ClaimHashForm';
// import { LoadEvent } from '../SignerClaimPage';

/* Constants */
import { TX_STATUS } from '../lib/constants';

/* Assets */
import HeaderShadow from '../images/header-shadow-desktop-white.svg';


const ClaimHeader: React.FC<{title: string, image?: string}> = ({title, image}) => {
  return (
    <div className={'claim-header'}>
      <div className={'title'}>{title}</div>
      <div className={'logo-event'}>
        {image && <img src={image} alt="Event" />}
      </div>
      <div className={'wave-holder'}>
        <img src={HeaderShadow} />
      </div>
    </div>
  )
};

const ClaimForm: React.FC = () => {
  return (
    <div className={'container'}>
      <div>
        <Formik
          enableReinitialize
          onSubmit={() => {}}
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

const PendingClaim: React.FC = () => {
  return (<h1>Pending</h1>)
};

const FinishedClaim: React.FC = () => {
  return (<h1>Finished</h1>)
};

export const CodeClaimPage: React.FC<RouteComponentProps<{ hash: string }>> = ({ match }) => {
  const [claim, setClaim] = useState<null | HashClaim>(null);
  let { hash } = match.params;
  let title = 'POAP Claim';

  let body = hash ? <ClaimForm /> : <ClaimHashForm />;
  if (claim && claim.tx_status) {
    if (claim.tx_status === TX_STATUS.pending) {
      body = <PendingClaim />
    }
    if (claim.tx_status === TX_STATUS.passed) {
      body = <FinishedClaim />
    }
  }

  return (
    <div className={'code-claim-page'}>
      <ClaimHeader title={title} />
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
