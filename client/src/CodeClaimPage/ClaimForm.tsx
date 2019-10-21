import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { ErrorMessage, Field, FieldProps, Form, Formik, FormikActions } from 'formik';

/* Helpers */
import { hasMetamask, tryGetAccount, loginMetamask, isMetamaskLogged } from '../poap-eth';
import { HashClaim, postClaimHash } from '../api';
import { AddressSchema } from '../lib/schemas';

/* Components */
import { SubmitButton } from '../components/SubmitButton';

type QRFormValues = {
  address: string;
};

/*
* @dev: Form component to get the address and submit mint request
* Logic behind web3 enabled status
* We will always try to populate the address field, but as Metamask requires
* that the user 'connect' their wallet to the site (`ethereum.enable()`),
* we ask if the user has a web3 instance that is not Metamask or if it's, it should
* be already logged-in: `if(enabledWeb3 && (!hasMetamask() || isMetamaskLogged()))`
* If the user has another provider, we will try to get the account at the moment
* */
const ClaimForm: React.FC<{
  enabledWeb3: boolean | null,
  claim: HashClaim,
  checkClaim: (hash: string) => void
}> = ({enabledWeb3, claim, checkClaim}) => {
  const [account, setAccount] = useState<string>('');

  useEffect(() => {
    if(enabledWeb3 && (!hasMetamask() || isMetamaskLogged())) getAddress();
  }, [enabledWeb3]);

  const getAddress = () => {
    if(!hasMetamask() || isMetamaskLogged()) {
      tryGetAccount()
        .then(address => {
          if (address) setAccount(address);
        })
        .catch(e => {
          console.log('Error while fetching account: ', e);
        });
    } else {
      loginMetamask().then(response => setAccount(response.account));
    }
  };

  const handleFormSubmit = async (
    values: QRFormValues,
    actions: FormikActions<QRFormValues>
  ) => {
    try {
      actions.setSubmitting(true);
      await postClaimHash(claim.qr_hash.toLowerCase(), values.address.toLowerCase(), claim.secret);
      checkClaim(claim.qr_hash);
    } catch (error) {
      actions.setStatus({ ok: false, msg: `Badge couldn't be minted` });
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <div className={'container'} data-aos="fade-up" data-aos-delay="300">
      <div>
        <Formik
          enableReinitialize
          onSubmit={handleFormSubmit}
          initialValues={{ address: account }}
          isInitialValid={account !== ''}
          validationSchema={AddressSchema}
        >
          {({ isValid, isSubmitting, status }) => {
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
                  <div>Please complete the input above to continue</div>
                  {enabledWeb3 &&
                  <div>Web3 browser? <span onClick={getAddress}>Get my address</span></div>
                  }
                </div>
                <SubmitButton
                  text="Claim my badge"
                  isSubmitting={isSubmitting}
                  canSubmit={isValid && enabledWeb3 !== null}
                />
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  )
};

export default ClaimForm;