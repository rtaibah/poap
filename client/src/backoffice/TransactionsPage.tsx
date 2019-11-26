import React, { FC, useState, useEffect } from 'react';
import classNames from 'classnames';

/* Libraries */
import ReactModal from 'react-modal';
import ReactPaginate from 'react-paginate';
import { ErrorMessage, Field, FieldProps, Form, Formik, FormikActions } from 'formik';

/* Helpers */
import { GasPriceSchema } from '../lib/schemas';
import { TX_STATUS, etherscanLinks } from '../lib/constants';
import { Transaction, getTransactions, bumpTransaction } from '../api';
import { convertFromGWEI, convertToGWEI, reduceAddress } from '../lib/helpers';
/* Components */
import { Loading } from '../components/Loading';
import { SubmitButton } from '../components/SubmitButton';
/* Assets */
import gas from '../images/gas-station.svg';
import checked from '../images/checked.svg';
import error from '../images/error.svg';
import clock from '../images/clock.svg';

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
};

type GasPriceFormValues = {
  gasPrice: string;
};

const TransactionsPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [statusList, setStatusList] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<null | Transaction>(null);
  const [isFetchingTx, setIsFetchingTx] = useState<null | boolean>(null);
  const [transactions, setTransactions] = useState<null | Transaction[]>(null);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusList]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const txStatus = {
    [TX_STATUS.pending]: clock,
    [TX_STATUS.failed]: error,
    [TX_STATUS.passed]: checked,
  };

  const fetchTransactions = () => {
    setIsFetchingTx(true);
    setTransactions(null);

    getTransactions(PAGE_SIZE, page * PAGE_SIZE, statusList.join(','))
      .then(response => {
        if (!response) return;
        setTransactions(response.transactions);
        setTotal(response.total);
      })
      .catch(error => console.error(error))
      .finally(() => setIsFetchingTx(false));
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleFormSubmit = async (
    values: GasPriceFormValues,
    actions: FormikActions<GasPriceFormValues>
  ) => {
    if (!selectedTx) return;
    try {
      actions.setStatus(null);
      actions.setSubmitting(true);

      const gasPriceInWEI = convertFromGWEI(values.gasPrice);
      await bumpTransaction(selectedTx.tx_hash, gasPriceInWEI);
      fetchTransactions();
      closeEditModal();
    } catch (error) {
      actions.setStatus({ ok: false, msg: `Gas price couldn't be changed` });
    } finally {
      actions.setSubmitting(false);
    }
  };

  const handleFilterToggle = (status: string) => {
    let newStatusList = [...statusList];
    let index = newStatusList.indexOf(status);
    if (index > -1) {
      newStatusList.splice(index, 1);
    } else {
      newStatusList.push(status);
    }
    setStatusList(newStatusList);
  };

  const openEditModal = (transaction: Transaction) => {
    setModalOpen(true);
    setSelectedTx(transaction);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setSelectedTx(null);
  };

  return (
    <div className={'admin-table transactions'}>
      <h2>Transactions</h2>
      <div>
        <h4>Filters</h4>
        <div className={'filters'}>
          {Object.entries(TX_STATUS).map((entry, index) => {
            let status = entry[1];
            return (
              <div key={index} className={'filter'}>
                <input
                  type={'checkbox'}
                  id={`id_${status}`}
                  onChange={() => handleFilterToggle(status)}
                />
                <label htmlFor={`id_${status}`}>{status}</label>
              </div>
            );
          })}
        </div>
      </div>
      <div className={'row table-header visible-md'}>
        <div className={'col-md-1 center'}>#</div>
        <div className={'col-md-3'}>Tx Hash</div>
        <div className={'col-md-3'}>Signer</div>
        <div className={'col-md-2'}>Operation</div>
        <div className={'col-md-1 center'}>Status</div>
        <div className={'col-md-2 center'}>Gas Price (GWei)</div>
      </div>
      <div className={'row table-header visible-sm'}>
        <div className={'center'}>Transactions</div>
      </div>
      <div className={'admin-table-row'}>
        {isFetchingTx && <Loading />}
        {transactions &&
          transactions.map((tx, i) => {
            return (
              <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={tx.id}>
                <div className={'col-md-1 center'}>
                  <span className={'visible-sm'}>#</span>
                  {tx.id}
                </div>
                <div className={'col-md-3'}>
                  <span className={'visible-sm'}>Tx: </span>
                  <a href={etherscanLinks.tx(tx.tx_hash)} target={'_blank'}>
                    {reduceAddress(tx.tx_hash)}
                  </a>
                </div>
                <div className={'col-md-3'}>
                  <span className={'visible-sm'}>Signer: </span>
                  <a href={etherscanLinks.address(tx.signer)} target={'_blank'}>
                    {reduceAddress(tx.signer)}
                  </a>
                </div>
                <div className={'col-md-2 capitalize'}>
                  <span className={'visible-sm'}>Operation: </span>
                  {tx.operation}
                </div>
                <div className={'col-md-1 center'}>
                  <img src={txStatus[tx.status]} className={'status-icon'} alt={tx.status} />
                </div>
                <div className={'col-md-2 center'}>
                  <span className={'visible-sm'}>Gas Price (GWei): </span>
                  {convertToGWEI(tx.gas_price)}
                  {tx.status === TX_STATUS.pending && (
                    <img
                      src={gas}
                      alt={'Edit'}
                      className={'edit-icon'}
                      onClick={() => openEditModal(tx)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        {transactions && transactions.length === 0 && !isFetchingTx && (
          <div className={'no-results'}>No transactions found</div>
        )}
      </div>
      {total > 0 && (
        <div className={'pagination'}>
          <ReactPaginate
            pageCount={Math.ceil(total / PAGE_SIZE)}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            activeClassName={'active'}
            onPageChange={handlePageChange}
          />
        </div>
      )}
      <ReactModal isOpen={modalOpen} shouldFocusAfterRender={true}>
        <div>
          <h3>Edit Gas Price</h3>
          {selectedTx && (
            <>
              <div className={'description'}>
                Modify gas price for tx{' '}
                <a href={etherscanLinks.tx(selectedTx.tx_hash)} target={'_blank'}>
                  {selectedTx.tx_hash}
                </a>
                . Operation: {selectedTx.operation}
              </div>
              <Formik
                enableReinitialize
                onSubmit={handleFormSubmit}
                initialValues={{ gasPrice: convertToGWEI(selectedTx.gas_price) }}
                validationSchema={GasPriceSchema}
              >
                {({ dirty, isValid, isSubmitting, status, touched }) => {
                  return (
                    <Form className="price-gas-modal-form">
                      <Field
                        name="gasPrice"
                        render={({ field, form }: FieldProps) => {
                          return (
                            <input
                              type="text"
                              autoComplete="off"
                              className={classNames(!!form.errors[field.name] && 'error')}
                              placeholder={'Gas price in GWEI'}
                              {...field}
                            />
                          );
                        }}
                      />
                      <ErrorMessage name="gasPrice" component="p" className="bk-error" />
                      {status && (
                        <p className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</p>
                      )}
                      <SubmitButton
                        text="Modify gas price"
                        isSubmitting={isSubmitting}
                        canSubmit={isValid && dirty}
                      />
                      <div onClick={closeEditModal} className={'close-modal'}>
                        Cancel
                      </div>
                    </Form>
                  );
                }}
              </Formik>
            </>
          )}
        </div>
      </ReactModal>
    </div>
  );
};

export { TransactionsPage };
