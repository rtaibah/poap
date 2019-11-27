import React, { FC, useState, useEffect, ChangeEvent } from 'react';
import { useToasts } from 'react-toast-notifications';

/* Libraries */
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';
import { withFormik, Formik } from 'formik';

/* Components */
import { Loading } from '../components/Loading';

/* Helpers */
import { QrCode, getQrCodes, getEvents, PoapEvent } from '../api';
import { reduceAddress } from '../lib/helpers';
import { etherscanLinks } from '../lib/constants';

/* Assets */
import checked from '../images/checked.svg';
import error from '../images/error.svg';

/* Typings */
import { Value } from '../types';

// shemas
import { UpdateByRangeModalWithFormikSchema } from '../lib/schemas';

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
};

export type QrCode = {
  id: number;
  qr_hash: string;
  claimed: boolean;
  tx_hash: string;
  event_id: number;
  event: PoapEvent;
};

const QrPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isFetchingQrCodes, setIsFetchingQrCodes] = useState<null | boolean>(null);
  const [qrCodes, setQrCodes] = useState<null | QrCode[]>(null);
  const [claimStatus, setClaimStatus] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [isUpdateByRangeModalOpen, setIsUpdateByRangeModalOpen] = useState<boolean>(false);
  const [isUpdateSelectionModalOpen, setIsUpdateSelectionModalOpen] = useState<boolean>(false);

  const { addToast } = useToasts();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchQrCodes();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    page !== 0 ? setPage(0) : fetchQrCodes();
  }, [selectedEvent, claimStatus]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchEvents = async () => {
    const events = await getEvents();
    setEvents(events);
  };

  const fetchQrCodes = async () => {
    setIsFetchingQrCodes(true);

    let status = undefined;
    if (claimStatus.length === 1) status = claimStatus[0] === 'claimed';

    let event_id = undefined;
    if (selectedEvent !== undefined) event_id = selectedEvent > -1 ? selectedEvent : undefined;

    try {
      const response = await getQrCodes(PAGE_SIZE, page * PAGE_SIZE, status, event_id);
      if (!response) return;
      setQrCodes(response.codes);
      setTotal(response.total);
    } catch (e) {
      addToast(e.message, {
        appearance: 'error',
        autoDismiss: true,
      });
    } finally {
      setIsFetchingQrCodes(false);
    }
  };

  const handleCheckbox = (value: Value) => {
    if (!claimStatus.includes(value))
      return setClaimStatus(prevClaimStatus => [...prevClaimStatus, value]);
    setClaimStatus(prevClaimStatus => [...prevClaimStatus].filter(val => val !== value));
  };

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(Number(e.target.value));
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleUpdateClick = (modal: 'byRange' | 'selection', action: boolean): void => {
    if (modal === 'byRange') setIsUpdateByRangeModalOpen(action);
    if (modal === 'selection') setIsUpdateSelectionModalOpen(action);
  };

  const handleUpdateByRangeClick = (): void => {
    handleUpdateClick('byRange', true);
  };

  const handleUpdateSelectionClick = (): void => {
    handleUpdateClick('selection', true);
  };

  const handleByRangeModalRequestClose = (): void => {
    handleUpdateClick('byRange', false);
  };

  const handleSelectionModalRequestClose = (): void => {
    handleUpdateClick('selection', false);
  };

  return (
    <div className={'admin-table qr'}>
      <h2>QR Codes</h2>
      <div>
        <h4>Filters</h4>
        <div className={'filters qr'}>
          <div className={'filter col-md-5'}>
            <label>Event: </label>
            <div className="filter-option">
              <select onChange={handleSelect}>
                <option key={'initialValue'} value={-1}>
                  Select an option
                </option>
                {events &&
                  events.map(event => {
                    const label = `${event.name} (${event.fancy_id}) - ${event.year}`;
                    return (
                      <option key={event.id} value={event.id}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div className={'filter col-md-4'}>
            <label>Status: </label>
            <div className={'filter-group'}>
              <div className="filter-option">
                <input
                  type={'checkbox'}
                  id={`claimed`}
                  onChange={() => handleCheckbox('claimed')}
                  checked={claimStatus.includes('claimed')}
                />
                <label htmlFor={`claimed`}>Claimed</label>
              </div>
              <div className="filter-option">
                <input
                  type={'checkbox'}
                  id={`unclaimed`}
                  onChange={() => handleCheckbox('unclaimed')}
                  checked={claimStatus.includes('unclaimed')}
                />
                <label htmlFor={`unclaimed`}>Unclaimed</label>
              </div>
            </div>
          </div>

          <div className={'action-button-container col-md-4'}>
            <button className={'action-button'} onClick={handleUpdateByRangeClick}>
              Update by range
            </button>
            <button className={'action-button'} onClick={handleUpdateSelectionClick}>
              Update selection
            </button>
          </div>

          <ReactModal
            isOpen={isUpdateByRangeModalOpen}
            onRequestClose={handleByRangeModalRequestClose}
            shouldFocusAfterRender={true}
            shouldCloseOnOverlayClick={true}
            shouldCloseOnEsc={true}
          >
            <UpdateByRangeModalWithFormik />
          </ReactModal>

          <ReactModal
            isOpen={isUpdateSelectionModalOpen}
            onRequestClose={handleSelectionModalRequestClose}
            shouldFocusAfterRender={true}
            shouldCloseOnOverlayClick={true}
            shouldCloseOnEsc={true}
          >
            <UpdateSelectionModal />
          </ReactModal>
        </div>
      </div>
      <div className={'row table-header visible-md'}>
        <div className={'col-md-1 center'}>#</div>
        <div className={'col-md-2'}>QR Hash</div>
        <div className={'col-md-5'}>Event</div>
        <div className={'col-md-2 center'}>Status</div>
        <div className={'col-md-2'}>Tx Hash</div>
      </div>
      <div className={'row table-header visible-sm'}>
        <div className={'center'}>QR Codes</div>
      </div>
      <div className={'admin-table-row'}>
        {isFetchingQrCodes && <Loading />}
        {qrCodes &&
          !isFetchingQrCodes &&
          qrCodes.map((qr, i) => {
            return (
              <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={qr.id}>
                <div className={'col-md-1 center'}>
                  <span className={'visible-sm'}>#</span>
                  {qr.id}
                </div>

                <div className={'col-md-2'}>
                  <span className={'visible-sm'}>QR Hash</span>
                  {qr.qr_hash}
                </div>

                <div className={'col-md-5 ellipsis'}>
                  <span className={'visible-sm'}>Event: </span>
                  {qr.event === null ? '-' : qr.event.name}
                </div>

                <div className={'col-md-2 center status'}>
                  <span className={'visible-sm'}>Status: </span>
                  <img
                    src={qr.claimed ? checked : error}
                    alt={qr.event && qr.event.name ? `${qr.event.name} status` : 'qr status'}
                    className={'status-icon'}
                  />
                </div>

                <div className={'col-md-2'}>
                  <span className={'visible-sm'}>Tx Hash: </span>
                  <a href={etherscanLinks.tx(qr.tx_hash)} target={'_blank'}>
                    {reduceAddress(qr.tx_hash)}
                  </a>
                </div>
              </div>
            );
          })}
        {qrCodes && qrCodes.length === 0 && !isFetchingQrCodes && (
          <div className={'no-results'}>No QR codes found</div>
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
            forcePage={page}
          />
        </div>
      )}
    </div>
  );
};

type ByRangeModalValues = {
  from: number | null;
  to: number | null;
  event: PoapEvent | null;
  selected: boolean;
};

type UpdateByRangeModalProps = {
  values: ByRangeModalValues;
};

const UpdateByRangeModal: React.FC<UpdateByRangeModalProps> = ({ values }) => {
  const handleSubmit = () => {
    console.log('submit');
  };

  return (
    <Formik initialValues={values} onSubmit={handleSubmit}>
      <div className={'update-modal-container'}>
        <input type="text" placeholder="From" />
        <input type="text" placeholder="To" />
        <select>
          <option>1</option>
          <option>1</option>
        </select>
        <input type="checkbox" className={'by-range-modal'} />
      </div>
    </Formik>
  );
};

const UpdateByRangeModalWithFormik = withFormik({
  displayName: 'UpdateByRangeModalForm',
  mapPropsToValues: (): ByRangeModalValues => ({
    from: null,
    to: null,
    event: null,
    selected: false,
  }),
  validationSchema: UpdateByRangeModalWithFormikSchema,
  handleSubmit: () => false,
})(UpdateByRangeModal);

const UpdateSelectionModal: React.FC = () => (
  <div>
    <span>UpdateSelectionModal</span>
  </div>
);

export { QrPage };
