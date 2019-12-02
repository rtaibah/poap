import React, { FC, useState, useEffect, ChangeEvent } from 'react';
import { useToasts } from 'react-toast-notifications';

/* Libraries */
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';
import { Formik } from 'formik';

/* Components */
import { Loading } from '../components/Loading';
import FilterSelect from '../components/FilterSelect';
import FilterButton from '../components/FilterButton';

/* Helpers */
import { QrCode, getQrCodes, getEventsForSpecificUser, PoapEvent, getEvents } from '../api';
import { reduceAddress } from '../lib/helpers';
import { etherscanLinks } from '../lib/constants';
import { authClient } from '../auth';

/* Assets */
import checked from '../images/checked.svg';
import error from '../images/error.svg';

/* Typings */
import { Value } from '../types';

// shemas
import { UpdateByRangeModalWithFormikSchema } from '../lib/schemas';

const PAGE_SIZE = 10;

const status = ['claimed', 'unclaimed'];

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
  const [claimStatus, setClaimStatus] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [selectedQrs, setSelectedQrs] = useState<string[]>([]);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [isRefetchConfirmed, setIsRefetchConfirmed] = useState<boolean>(false);

  const { addToast } = useToasts();

  //testuseeffect
  useEffect(() => console.log(claimStatus), [claimStatus]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchQrCodes();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    page === 0 ? fetchQrCodes() : setPage(0);
  }, [selectedEvent, claimStatus]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    (isRefetchConfirmed || selectedQrs.length < 1) && fetchQrCodes();
    setIsRefetchConfirmed(false);
  }, [selectedEvent, claimStatus, isRefetchConfirmed]);

  useEffect(() => {
    setSelectedQrs([]);
  }, [isRefetchConfirmed]);

  const fetchEvents = async () => {
    const isAdmin = authClient.user['https://poap.xyz/roles'].includes('administrator');

    const events = isAdmin ? await getEvents() : await getEventsForSpecificUser();
    setEvents(events);
  };

  const fetchQrCodes = async () => {
    setIsFetchingQrCodes(true);

    let event_id = undefined;
    if (selectedEvent !== undefined) event_id = selectedEvent > -1 ? selectedEvent : undefined;

    let _status = undefined;

    if (claimStatus) {
      _status = claimStatus === 'claimed' ? true : false;
    }

    try {
      const response = await getQrCodes(PAGE_SIZE, page * PAGE_SIZE, _status, event_id);
      if (!response) return;
      setQrCodes(response.qr_claims);
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

  const triggerModalOnQrs = () => {
    if (selectedQrs.length > 0) openConfirmationModal();
  };

  const setStatusCheckbox = (value: Value | ''): void => setClaimStatus(value);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const { value } = e.target;
    const numbericValue = Number(value);

    setSelectedEvent(numbericValue);

    triggerModalOnQrs();
  };

  const handleInputModalOpening = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { value } = e.target;

    if (value === '') setStatusCheckbox('');
    if (value === 'claimed') setStatusCheckbox('claimed');
    if (value === 'unclaimed') setStatusCheckbox('unclaimed');

    triggerModalOnQrs();
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleQrCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { id } = e.target;
    const stringifiedId = String(id);

    return selectedQrs.includes(stringifiedId)
      ? setSelectedQrs(selectedQrs => selectedQrs.filter((qrId: string) => qrId !== stringifiedId))
      : setSelectedQrs(selectedQrs => [...selectedQrs, stringifiedId]);
  };

  const updateModal = (modal: 'update' | 'confirmation', action: boolean): void => {
    if (modal === 'update') setIsUpdateModalOpen(action);
    if (modal === 'confirmation') setIsConfirmationModalOpen(action);
  };

  const handleUpdateModalClick = (): void => updateModal('update', true);

  const openConfirmationModal = (): void => updateModal('confirmation', true);

  const handleUpdateModalRequestClose = (): void => updateModal('update', false);

  const handleConfirmationModalRequestClose = (): void => updateModal('confirmation', false);

  return (
    <div className={'admin-table qr'}>
      <h2>QR Codes</h2>
      <div className={'filters-container qr'}>
        <div className={'filter col-md-4'}>
          <div className="filter-option">
            <FilterSelect handleChange={handleSelectChange}>
              <option key={'initialValue'} value={-1}>
                Filter by event
              </option>
              {events &&
                events.map(event => {
                  const label = `${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${
                    event.year
                  }`;

                  return (
                    <option key={event.id} value={event.id}>
                      {label}
                    </option>
                  );
                })}
            </FilterSelect>
          </div>
        </div>

        <div className={'filter col-md-3'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleInputModalOpening}>
              <option value="">Filter by status</option>
              {status.map(status => (
                <option value={status}>{status}</option>
              ))}
            </FilterSelect>
            {/* <div className="filter-option">
                <input
                  type={'checkbox'}
                  id={`claimed`}
                  onChange={handleInputModalOpening}
                  checked={claimStatus.includes('claimed')}
                />
                <label htmlFor={`claimed`}>Claimed</label>
              </div>
              <div className="filter-option">
                <input
                  type={'checkbox'}
                  id={`unclaimed`}
                  onChange={handleInputModalOpening}
                  checked={claimStatus.includes('unclaimed')}
                />
                <label htmlFor={`unclaimed`}>Unclaimed</label>
              </div> */}
          </div>
        </div>

        <div className={'action-button-container col-md-5'}>
          <FilterButton text="Update" handleClick={handleUpdateModalClick} />
        </div>

        <ReactModal
          isOpen={isUpdateModalOpen}
          onRequestClose={handleUpdateModalRequestClose}
          shouldFocusAfterRender={true}
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <UpdateModal events={events} />
        </ReactModal>

        <ReactModal
          isOpen={isConfirmationModalOpen}
          onRequestClose={handleConfirmationModalRequestClose}
          shouldFocusAfterRender={true}
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
        >
          <ConfirmationModal
            handleConfirmationModalRequestClose={handleConfirmationModalRequestClose}
            setIsRefetchConfirmed={setIsRefetchConfirmed}
          />
          {/* <ConfirmationModal handleSelect={handleSelect} handleCheckbox={handleCheckbox} /> */}
        </ReactModal>
      </div>
      <div className={'row table-header visible-md'}>
        <div className={'col-md-1 center'}>-</div>
        <div className={'col-md-1 center'}>#</div>
        <div className={'col-md-2'}>QR Hash</div>
        <div className={'col-md-4'}>Event</div>
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
                  <input
                    type="checkbox"
                    onChange={handleQrCheckboxChange}
                    checked={selectedQrs.includes(String(qr.id))}
                    id={String(qr.id)}
                  />
                </div>

                <div className={'col-md-1 center'}>
                  <span className={'visible-sm'}>#</span>
                  {qr.id}
                </div>

                <div className={'col-md-2'}>
                  <span className={'visible-sm'}>QR Hash</span>
                  {qr.qr_hash}
                </div>

                <div className={'col-md-4 elipsis'}>
                  <span className={'visible-sm'}>Event: </span>
                  {(!qr.event || !qr.event.name) && <span>-</span>}

                  {qr.event && qr.event.event_url && qr.event.name && (
                    <a href={qr.event.event_url} target="_blank" rel="noopener noreferrer">
                      {qr.event.name}
                    </a>
                  )}

                  {qr.event && qr.event.name && <span>{qr.event.name}</span>}
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
                    {qr.tx_hash && reduceAddress(qr.tx_hash)}
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

type UpdateByRangeModalProps = {
  events: PoapEvent[];
};

const UpdateModal: React.FC<UpdateByRangeModalProps> = ({ events }) => {
  const handleSubmit = () => {
    console.log('submit');
  };

  return (
    <Formik
      initialValues={{
        from: null,
        to: null,
        event: null,
        selected: false,
      }}
      onSubmit={handleSubmit}
    >
      <div className={'update-modal-container'}>
        <input type="text" placeholder="From" />
        <input type="text" placeholder="To" />
        <select>
          {events &&
            events.map(event => {
              const label = `${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${
                event.year
              }`;
              return (
                <option key={event.id} value={event.id}>
                  {label}
                </option>
              );
            })}
        </select>
        <input type="checkbox" className={'by-range-modal'} />
      </div>
    </Formik>
  );
};

type ConfirmationModalProps = {
  handleConfirmationModalRequestClose: Function;
  setIsRefetchConfirmed: Function;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  handleConfirmationModalRequestClose,
  setIsRefetchConfirmed,
}) => {
  const handleCancelButton = (e: React.MouseEvent<HTMLButtonElement>): void =>
    handleConfirmationModalRequestClose();

  const handleConfirmButton = (e: React.MouseEvent<HTMLButtonElement>): void => {
    setIsRefetchConfirmed(true);
    handleConfirmationModalRequestClose();
  };

  return (
    <div>
      <span>You are about to change a filter but you have a selection of QRs alredy done</span>
      <button onClick={handleCancelButton}>Cancel</button>
      <button onClick={handleConfirmButton}>Confirm</button>
    </div>
  );
};

export { QrPage };
