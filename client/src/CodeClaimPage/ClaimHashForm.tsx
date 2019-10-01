import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import classNames from 'classnames';

import { Formik, Form, Field, FieldProps, ErrorMessage } from 'formik';

/* Schemas */
import { ClaimHashSchema } from '../lib/schemas';
/* Constants */
import { ROUTES } from '../lib/constants';
/* Components */
import { SubmitButton } from '../components/SubmitButton';

type HashFormValues = {
  hash: string;
};

const ClaimHashForm: React.FC = () => {
  const [hash, setHash] = useState<null | string>(null);

  const handleForm = (
    values: HashFormValues
  ) => {
    setHash(values.hash)
  };

  if (hash) return <Redirect to={ROUTES.codeClaimPageHash.replace(':hash', hash)} />

  return (
    <div className={'container'}>
      <div>
        <Formik
          enableReinitialize
          onSubmit={handleForm}
          initialValues={{ hash: '' }}
          validationSchema={ClaimHashSchema}
        >
          {({ dirty, isValid, isSubmitting, status, touched }) => {
            return (
              <Form className="claim-form">
                <div className={'web3-browser'}>
                  Please complete the form below to continue
                </div>
                <Field
                  name="hash"
                  render={({ field, form }: FieldProps) => {
                    return (
                      <input
                        type="text"
                        autoComplete="off"
                        className={classNames(!!form.errors[field.name] && 'error')}
                        placeholder={'Type your code'}
                        {...field}
                      />
                    );
                  }}
                />
                <ErrorMessage name="gasPrice" component="p" className="bk-error"/>
                {status && (
                  <p className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</p>
                )}
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
  );
};

export default ClaimHashForm;