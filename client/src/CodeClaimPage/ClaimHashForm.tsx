import React  from 'react';
import classNames from 'classnames';

import { Formik, Form, Field, FieldProps } from 'formik';

/* Schemas */
import { ClaimHashSchema } from '../lib/schemas';
/* Components */
import { SubmitButton } from '../components/SubmitButton';

type HashFormValues = {
  hash: string;
};

const ClaimHashForm: React.FC<{error: boolean, loading: boolean, checkClaim: (hash: string) => void}> = ({error, loading, checkClaim}) => {

  const handleForm = (
    values: HashFormValues
  ) => {
    checkClaim(values.hash)
  };

  return (
    <div className={'container'}>
      <div>
        <Formik
          enableReinitialize
          onSubmit={handleForm}
          initialValues={{ hash: '' }}
          validationSchema={ClaimHashSchema}
        >
          {({ dirty, isValid }) => {
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
                {error && (
                  <p className={'bk-msg-error'}>Badge not found</p>
                )}
                <SubmitButton
                  text="Claim my badge"
                  isSubmitting={loading}
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