import React, { FC, useState, useEffect } from 'react';
import { Formik, FormikActions, Form, Field, FieldProps, ErrorMessage } from 'formik';
import classNames from 'classnames';

/* Libraries */
import ReactPaginate from 'react-paginate';

/* Helpers */
import { TX_STATUS } from '../lib/constants';
import { GasPriceSchema } from '../lib/schemas';
import { Transaction, getTransactions } from '../api';
import { convertToGWEI, convertFromGWEI, reduceAddress } from '../lib/helpers';
/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { Loading } from '../components/Loading';
/* Assets */
import gas from '../images/gas-station.svg';
import checked from '../images/checked.svg';
import error from '../images/error.svg';
import clock from '../images/clock.svg';

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
}

const TransactionsPage: FC = () => {
  const [page, setPage] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)
  const [isFetchingTx, setIsFetchingTx] = useState<null | boolean>(null);
  const [transactions, setTransactions] = useState<null | Transaction[]>(null);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const txStatus = {
    [TX_STATUS.pending]: clock,
    [TX_STATUS.failed]: error,
    [TX_STATUS.passed]: checked,
  };

  const fetchTransactions = () => {
    setIsFetchingTx(true);
    setTransactions(null);

    getTransactions(PAGE_SIZE, page  * PAGE_SIZE)
      .then(response => {
        if (!response) return;
        setTransactions(response.transactions);
        setTotal(response.total);
      })
      .catch(error => console.error(error))
      .finally(() => setIsFetchingTx(false));
  }

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  }

  return (
    <div className={'admin-table'}>
      <h2>Transactions</h2>
      <div className={'row table-header'}>
        <div className={'col-xs-1 center'}>#</div>
        <div className={'col-xs-3'}>Tx Hash</div>
        <div className={'col-xs-3'}>Signer</div>
        <div className={'col-xs-2'}>Operation</div>
        <div className={'col-xs-1 center'}>Status</div>
        <div className={'col-xs-2 center'}>Gas Price (GWei)</div>
      </div>
      <div className={'admin-table-row'}>
        {isFetchingTx && <Loading />}
        {transactions && transactions.map((tx, i) => {
          return (
            <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={tx.id}>
              <div className={'col-xs-1 center'}>{tx.id}</div>
              <div className={'col-xs-3'}>
                <a href={`https://etherscan.io/tx/${tx.tx_hash}`} target={"_blank"}>{reduceAddress(tx.tx_hash)}</a>
              </div>
              <div className={'col-xs-3'}>
                <a href={`https://etherscan.io/address/${tx.signer}`} target={"_blank"}>{reduceAddress(tx.signer)}</a>
              </div>
              <div className={'col-xs-2 capitalize'}>{tx.operation}</div>
              <div className={'col-xs-1 center'}>
                <img src={txStatus[tx.status]} className={'status-icon'} />
              </div>
              <div className={'col-xs-2 center'}>
                {convertToGWEI(tx.gas_price)}
                {tx.status === TX_STATUS.pending && <img src={gas} alt={'Edit'} className={'edit-icon'} />}
              </div>
            </div>
          )
        })}
      </div>
      {total > 0 &&
        <div className={'pagination'}>
          <ReactPaginate
            pageCount={Math.ceil(total/PAGE_SIZE) + 5}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            activeClassName={'active'}
            onPageChange={handlePageChange}
          />
        </div>
      }
    </div>
  );
};

export { TransactionsPage };
