import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { ErrorMessage, Field, FieldProps, Form, Formik, FormikActions } from 'formik';

/* Helpers */
import { tryGetAccount } from 'poap-eth';
import { HashClaim, postClaimHash } from 'api';
import { AddressSchema } from 'lib/schemas';
import { hasWeb3 } from 'poap-eth';

/* Components */
import { SubmitButton } from 'components/SubmitButton';
import ClaimFooterMessage from './ClaimFooterMessage';

/* Lib */
import { COLORS, STYLES } from 'lib/constants';
import { useImageSrc } from 'lib/hooks/useImageSrc';

/* Types */
import { Template } from 'api';

type QRFormValues = {
  address: string;
};

const ClaimForm: React.FC<{
  claim?: HashClaim;
  method: string;
  template?: Template;
  onSubmit: (claim: HashClaim) => void;
}> = ({ claim, onSubmit, method, template }) => {
  const [enabledWeb3, setEnabledWeb3] = useState<boolean | null>(null);
  const [account, setAccount] = useState<string>('');

  const mobileImageUrlRaw = claim?.event_template?.mobile_image_url ?? template?.mobile_image_url;
  const mobileImageLink = claim?.event_template?.mobile_image_link ?? template?.mobile_image_link;
  const mainColor = claim?.event_template?.main_color ?? template?.main_color;

  const mobileImageUrl = useImageSrc(mobileImageUrlRaw);

  useEffect(() => {
    hasWeb3().then(setEnabledWeb3);
  }, []);

  const getAddress = () => {
    tryGetAccount()
      .then((address) => {
        if (address) setAccount(address);
      })
      .catch((e) => {
        console.log('Error while fetching account: ', e);
      });
  };

  const handleFormSubmit = async (values: QRFormValues, actions: FormikActions<QRFormValues>) => {
    try {
      actions.setSubmitting(true);
      if (claim) {
        const newClaim = await postClaimHash(
          claim.qr_hash.toLowerCase(),
          values.address.toLowerCase(),
          claim.secret,
          method
        );

        onSubmit(newClaim);
      }
    } catch (error) {
      actions.setStatus({
        ok: false,
        msg: `Badge couldn't be claimed: ${error.message}`,
      });
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
                        style={{ borderColor: mainColor ?? COLORS.primaryColor }}
                        className={classNames(!!form.errors[field.name] && 'error')}
                        placeholder={'Input your Ethereum address or ENS name'}
                        {...field}
                      />
                    );
                  }}
                />
                <ErrorMessage name="gasPrice" component="p" className="bk-error" />
                {status && <p className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</p>}
                <div className={'web3-browser'}>
                  {enabledWeb3 && (
                    <div>
                      Web3 browser? <span onClick={getAddress}>Get my address</span>
                    </div>
                  )}
                </div>

                <SubmitButton
                  text="Claim POAP token"
                  style={{
                    backgroundColor: mainColor ?? COLORS.primaryColor,
                    boxShadow: mainColor ? STYLES.boxShadow(mainColor) : '',
                  }}
                  isSubmitting={isSubmitting}
                  canSubmit={isValid}
                />
              </Form>
            );
          }}
        </Formik>
      </div>
      <ClaimFooterMessage linkStyle={{ color: mainColor ?? COLORS.primaryColor }} />
      <div className="mobile-image">
        {mobileImageUrl ? (
          mobileImageLink ? (
            <a href={mobileImageLink} rel="noopener noreferrer" target="_blank">
              <img alt="Brand publicity" src={mobileImageUrl} />
            </a>
          ) : (
            <img alt="Brand publicity" src={mobileImageUrl} />
          )
        ) : null}
      </div>
    </div>
  );
};

export default ClaimForm;
