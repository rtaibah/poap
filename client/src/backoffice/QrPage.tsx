import React, { FC, useState, useEffect, ChangeEvent } from 'react';

/* Libraries */
import ReactPaginate from 'react-paginate';

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

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
};

export interface QrCode {
  id: number;
  qr_hash: string;
  claimed: boolean;
  tx_hash: string;
  event_id: number;
  event: PoapEvent;
}

const QrPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isFetchingQrCodes, setIsFetchingQrCodes] = useState<null | boolean>(null);
  const [qrCodes, setQrCodes] = useState<null | QrCode[]>(null);
  const [claimStatus, setClaimStatus] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchQrCodes();
  }, [page]);

  useEffect(() => {
    page !== 0 ? setPage(0) : fetchQrCodes();
  }, [selectedEvent, claimStatus]);

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
      console.log(e);
    } finally {
      setIsFetchingQrCodes(false);
    }
  };

  const handleCheckbox = (value: Value) => {
    if (!claimStatus.includes(value)) return setClaimStatus([...claimStatus, value]);
    setClaimStatus([...claimStatus].filter(val => val !== value));
  };

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(Number(e.target.value));
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  return (
    <div className={'admin-table qr'}>
      <h2>QR Codes</h2>
      <div>
        <h4>Filters</h4>
        <div className={'filters qr'}>
          <div className={'filter col-md-6'}>
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

          <div className={'filter col-md-6'}>
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
                  <img src={qr.claimed ? checked : error} className={'status-icon'} alt={''} />
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

export { QrPage };
