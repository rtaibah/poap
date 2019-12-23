import React, { FC, useState, useEffect } from 'react';
import { useToasts } from 'react-toast-notifications';

/* Libraries */
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';
import { Formik, FormikActions } from 'formik';

/* Components */
import { Loading } from '../components/Loading';
import FilterSelect from '../components/FilterSelect';
import FilterButton from '../components/FilterButton';
import FilterChip from '../components/FilterChip';

/* Helpers */
import {
  QrCode,
  getQrCodes,
  getEventsForSpecificUser,
  PoapEvent,
  getEvents,
  qrCodesRangeAssign,
  qrCodesUpdate,
} from '../api';
import { reduceAddress } from '../lib/helpers';
import { etherscanLinks } from '../lib/constants';
import { authClient } from '../auth';

/* Assets */
import checked from '../images/checked.svg';
import error from '../images/error.svg';

/* Typings */
import { Value } from '../types';

// shemas
import {
  UpdateModalWithFormikRangeSchema,
  UpdateModalWithFormikSelectedQrsSchema,
} from '../lib/schemas';

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
  const [claimStatus, setClaimStatus] = useState<string>('');
  const [claimScanned, setClaimScanned] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [selectedQrs, setSelectedQrs] = useState<string[]>([]);
  const [initialFetch, setInitialFetch] = useState<boolean>(false);

  const { addToast } = useToasts();

  useEffect(() => {
    fetchEvents();
    if(!initialFetch){
      fetchQrCodes();
      setInitialFetch(true);
    }
  }, []);

  useEffect(() => {
    if (initialFetch) fetchQrCodes();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (initialFetch) {
      setSelectedQrs([])
      setPage(0)
    }
  }, [selectedEvent, claimStatus, claimScanned]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const cleanQrSelection = () => setSelectedQrs([])

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
    let _scanned = undefined;

    if (claimStatus) _status = claimStatus === 'claimed'
    if (claimScanned) _scanned = claimScanned === 'true'

    try {
      const response = await getQrCodes(PAGE_SIZE, page * PAGE_SIZE, _status, _scanned, event_id);
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const { value } = e.target;
    const numericValue = Number(value);
    setSelectedEvent(numericValue);
  };

  const handleStatusChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { value } = e.target;
    setClaimStatus(value);
  };

  const handleScannedChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { value } = e.target;
    setClaimScanned(value);
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

  const handleUpdateModalClick = (): void => setIsUpdateModalOpen(true);

  const handleUpdateModalRequestClose = (): void => setIsUpdateModalOpen(false);

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

        <div className={'filter col-md-2'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleStatusChange}>
              <option value="">Filter by status</option>
              <option value="claimed">Claimed</option>
              <option value="unclaimed">Unclaimed</option>
            </FilterSelect>
          </div>
        </div>

        <div className={'filter col-md-2'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleScannedChange}>
              <option value="">Filter by scanned</option>
              <option value="true">Scanned</option>
              <option value="false">Not scanned</option>
            </FilterSelect>
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
          <UpdateModal
            handleUpdateModalClosing={handleUpdateModalRequestClose}
            selectedQrs={selectedQrs}
            refreshQrs={fetchQrCodes}
            onSuccessAction={cleanQrSelection}
            events={events}
          />
        </ReactModal>
      </div>

      {isFetchingQrCodes && <Loading />}

      {qrCodes && qrCodes.length !== 0 && !isFetchingQrCodes && (
        <div>
          <div className={'row table-header visible-md'}>
            <div className={'col-md-1 center'}>-</div>
            <div className={'col-md-2'}>QR Hash</div>
            <div className={'col-md-4'}>Event</div>
            <div className={'col-md-1 center'}>Status</div>
            <div className={'col-md-1 center'}>Scanned</div>
            <div className={'col-md-3 center'}>Tx Hash</div>
          </div>
          <div className={'admin-table-row qr-table'}>
            {qrCodes.map((qr, i) => {
              return (
                <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={qr.id}>
                  <div className={'col-md-1 center checkbox'}>
                    {!qr.claimed && (
                      <input
                        type="checkbox"
                        disabled={qr.claimed}
                        onChange={handleQrCheckboxChange}
                        checked={selectedQrs.includes(String(qr.id))}
                        id={String(qr.id)}
                      />
                    )}
                  </div>

                  <div className={'col-md-2'}>
                    <span className={'visible-sm'}>QR Hash: </span>
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

                    {qr.event && qr.event.name && !qr.event.event_url && (
                      <span>{qr.event.name}</span>
                    )}
                  </div>

                  <div className={'col-md-1 center status'}>
                    <span className={'visible-sm'}>Status: </span>
                    <img
                      src={qr.claimed ? checked : error}
                      alt={qr.event && qr.event.name ? `${qr.event.name} status` : 'qr status'}
                      className={'status-icon'}
                    />
                  </div>

                  <div className={'col-md-1 center'}>
                    <span className={'visible-sm'}>Scanned: </span>
                    <img
                      src={qr.scanned ? checked : error}
                      alt={qr.scanned ? `QR Scanned` : 'QR not scanned'}
                      className={'status-icon'}
                    />
                  </div>

                  <div className={'col-md-3 center'}>
                    <span className={'visible-sm'}>Tx Hash: </span>
                    <a href={etherscanLinks.tx(qr.tx_hash)} target={'_blank'}>
                      {qr.tx_hash && reduceAddress(qr.tx_hash)}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          {total > 10 && (
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
      )}

      {qrCodes && qrCodes.length === 0 && !isFetchingQrCodes && (
        <div className={'no-results'}>No QR codes found</div>
      )}
    </div>
  );
};

type UpdateByRangeModalProps = {
  events: PoapEvent[];
  selectedQrs: string[];
  refreshQrs: () => void;
  onSuccessAction: () => void;
  handleUpdateModalClosing: () => void;
};

type UpdateModalFormikValues = {
  from: number | string;
  to: number | string;
  event: number;
  isUnassigning: boolean;
};

const UpdateModal: React.FC<UpdateByRangeModalProps> = ({
  events,
  selectedQrs,
  refreshQrs,
  onSuccessAction,
  handleUpdateModalClosing,
}) => {
  const [isSelectionActive, setIsSelectionActive] = useState<boolean>(false);
  const [isRangeActive, setIsRangeActive] = useState<boolean>(false);
  const { addToast } = useToasts();

  const hasSelectedQrs = selectedQrs.length > 0;

  useEffect(() => {
    hasSelectedQrs ? setIsSelectionActive(true) : setIsRangeActive(true);
  }, []);

  const handleUpdateModalSubmit = (
    values: UpdateModalFormikValues,
    actions: FormikActions<UpdateModalFormikValues>
  ) => {
    const { from, to, event, isUnassigning } = values;

    if (!isUnassigning && !event) {
      actions.setErrors({event: 'Required'})
      return false;
    }

    const _event = isUnassigning ? null : event;

    if (isRangeActive) {
      if (typeof from === 'number' && typeof to === 'number') {
        qrCodesRangeAssign(from, to, _event)
          .then(_ => {
            addToast('QR codes updated correctly', {
              appearance: 'success',
              autoDismiss: true,
            });
            onSuccessAction();
            refreshQrs();
            handleUpdateModalClosing();
          })
          .catch(e =>
            addToast(e.message, {
              appearance: 'error',
              autoDismiss: true,
            })
          );
      }
    }

    if (isSelectionActive) {
      qrCodesUpdate(selectedQrs, _event)
        .then(_ => {
          addToast('QR codes updated correctly', {
            appearance: 'success',
            autoDismiss: true,
          });
          onSuccessAction();
          refreshQrs();
          handleUpdateModalClosing();
        })
        .catch(e =>
          addToast(e.message, {
            appearance: 'error',
            autoDismiss: true,
          })
        );
    }
  };

  const handleChipClick = (event: React.ChangeEvent, setFieldValue: Function, values: any) => {
    setFieldValue('isUnassigning', !values.isUnassigning);
  };

  const handleSelectionChange = () => {
    if (!hasSelectedQrs) return;
    setIsRangeActive(false);
    setIsSelectionActive(true);
  };

  const handleRangeChange = () => {
    setIsSelectionActive(false);
    setIsRangeActive(true);
  };

  return (
    <Formik
      initialValues={{
        from: 0,
        to: 0,
        event: 0,
        isUnassigning: false,
      }}
      validationSchema={
        isSelectionActive
          ? UpdateModalWithFormikSelectedQrsSchema
          : UpdateModalWithFormikRangeSchema
      }
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={handleUpdateModalSubmit}
    >
      {({ values, errors, handleChange, handleSubmit, setFieldValue }) => {
        const { isUnassigning } = values;
        const isPlaceholderValue = Boolean(values.event);

        const resolveSelectClass = () => {
          if (isUnassigning) return '';
          if (errors.event && !Boolean(values.event)) return 'modal-select-error';
          if (!isPlaceholderValue) return 'placeholder-option';
          return '';
        };

        const resolveSelectText = () => {
          if (values.isUnassigning) return 'You are unassigning the QRs';
          if (errors.event && !Boolean(values.event)) return 'The selection is required';
          return 'Select an event';
        };

        const handleFormSubmitClick = () => {
          handleSubmit();
        };

        return (
          <div className={'update-modal-container'}>
            <div className={'modal-top-bar'}>
              <h3>QR Update</h3>
            </div>
            <div className="modal-content">
              <div className="option-container">
                <div className="radio-container">
                  <input
                    type="radio"
                    checked={isSelectionActive}
                    onChange={handleSelectionChange}
                  />
                </div>
                <div className="label-container">
                  <span>Selection</span>
                </div>
                <div className="content-container">
                  {hasSelectedQrs ? (
                    <span>{`You have ${selectedQrs.length} QR's selected`}</span>
                  ) : (
                    <span className="grey-text">You have no selected QRs</span>
                  )}
                </div>
              </div>
              <div className="option-container">
                <div className="radio-container">
                  <input type="radio" checked={isRangeActive} onChange={handleRangeChange} />
                </div>
                <div className="label-container">
                  <span>Range</span>
                </div>
                <div className="content-container">
                  <input
                    className={errors.from && !Boolean(values.from) ? 'modal-input-error' : ''}
                    type="number"
                    placeholder={
                      errors.from && !Boolean(values.from)
                        ? 'This field should be a positive number'
                        : 'From'
                    }
                    name="from"
                    onChange={handleChange}
                    disabled={!isRangeActive}
                  />
                  <input
                    className={errors.to && !Boolean(values.to) ? 'modal-input-error' : ''}
                    type="number"
                    placeholder={
                      errors.to && !Boolean(values.to)
                        ? 'This field should be a positive number'
                        : 'To'
                    }
                    name="to"
                    onChange={handleChange}
                    disabled={!isRangeActive}
                  />
                </div>
              </div>
              <select
                className={resolveSelectClass()}
                disabled={values.isUnassigning}
                name="event"
                onChange={handleChange}
              >
                <option value="">{resolveSelectText()}</option>
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
              <div className="modal-buttons-container">
                <FilterChip
                  name="isUnassigning"
                  text="Unasign QRs"
                  isActive={values.isUnassigning}
                  handleOnClick={(e: React.ChangeEvent) =>
                    handleChipClick(e, setFieldValue, values)
                  }
                />
                <div className="modal-action-buttons-container">
                  <FilterButton text="Cancel" handleClick={handleUpdateModalClosing}>
                    Cancel
                  </FilterButton>
                  <FilterButton text="Confirm update" handleClick={handleFormSubmitClick}>
                    Update
                  </FilterButton>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </Formik>
  );
};

export { QrPage };
