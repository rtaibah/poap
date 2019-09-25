import React, { FC, useState, useEffect } from 'react';
import { Formik, FormikActions, Form, Field, FieldProps, ErrorMessage } from 'formik';
import classNames from 'classnames';

/* Helpers */
import { GasPriceSchema } from '../lib/schemas';
import { getSigners, AdminAddress } from '../api';
import { convertToGWEI, convertFromGWEI, reduceAddress } from '../lib/helpers';
/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { Loading } from '../components/Loading';
/* Assets */
import edit from '../images/edit.svg';

type GasPriceFormValues = {
  gasPrice: string;
};

const AddressManagementPage: FC = () => {
  const [isFetchingAddresses, setIsFetchingAddresses] = useState<null | boolean>(null);
  const [addresses, setAddresses] = useState<null | AdminAddress[]>(null);

  useEffect(() => {
    setIsFetchingAddresses(true);

    getSigners()
      .then(addresses => {
        if (!addresses) return;
        setAddresses(addresses);
      })
      .catch(error => console.error(error))
      .finally(() => setIsFetchingAddresses(false));
  }, []);



  return (
    <div className={'address-table'}>
      <h2>Admin addresses management</h2>
      <div className={'row table-header'}>
        <div className={'col-xs-1 center'}>#</div>
        <div className={'col-xs-5'}>Address</div>
        <div className={'col-xs-2'}>Role</div>
        <div className={'col-xs-2 center'}>Balance (ETH)</div>
        <div className={'col-xs-2 center'}>Gas Price (GWei)</div>
      </div>
      <div className={'addresses-row'}>
        {isFetchingAddresses && <Loading />}
        {addresses && addresses.map((address, i) => {
          return (
            <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={address.id}>
              <div className={'col-xs-1 center'}>{address.id}</div>
              <div className={'col-xs-5'}>
                <a href={`https://etherscan.io/address/${address.signer}`} target={"_blank"}>{reduceAddress(address.signer)}</a>
              </div>
              <div className={'col-xs-2 capitalize'}>{address.role}</div>
              <div className={'col-xs-2 center'}>{address.balance}</div>
              <div className={'col-xs-2 center'}>
                {convertToGWEI(address.gas_price)}
                <img src={edit} alt={'Edit'} className={'edit-icon'} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export { AddressManagementPage };
