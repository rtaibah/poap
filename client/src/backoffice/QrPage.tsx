import React, { FC, useState, useEffect, ChangeEvent } from 'react';

/* Libraries */
import ReactPaginate from 'react-paginate';

/* Components */
import { Loading } from '../components/Loading';

/* Helpers */
import { QrCode, getQrCodes, getEvents, PoapEvent } from '../api';

/* Typings */
import { Name, Value } from '../types';

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

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    setIsFetchingQrCodes(true);

    // let event_id = undefined;
    // if (recipientFilter === 'event' && selectedEvent !== undefined) {
    //   event_id = selectedEvent > -1 ? selectedEvent : undefined;
    // }

    try {
      const response = await getQrCodes(
        PAGE_SIZE,
        page * PAGE_SIZE
        // notificationType,
        // event_id
      );
      if (!response) return;
      // setQrCodes(response.codes);
      // setTotal(response.total);
    } catch (e) {
      console.log(e);
    } finally {
      setIsFetchingQrCodes(false);
    }
  };

  return (
    <div className={'admin-table qr'}>
      <h2>QR Codes</h2>
      <div>
        <h4>Filters</h4>
      </div>
      <div className={'row table-header visible-md'}>
        <div className={'col-md-1 center'}>#</div>
        <div className={'col-md-4'}>Event</div>
        <div className={'col-md-3'}>Claimed</div>
        <div className={'col-md-4'}>Tx Hash</div>
      </div>
      <div className={'row table-header visible-sm'}>
        <div className={'center'}>QR Codes</div>
      </div>
      <div className={'admin-table-row'}>
        {/* {isFetchingNotifications && <Loading />} */}
        {/* {notifications &&
          !isFetchingNotifications &&
          notifications.map((notification, i) => {
            return (
              <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={notification.id}>
                <div className={'col-md-1 center'}>
                  <span className={'visible-sm'}>#</span>
                  {notification.id}
                </div>

                <div className={'col-md-4 ellipsis'}>
                  <span className={'visible-sm'}>Title: </span>
                  {notification.title}
                </div>

                <div className={'col-md-2'}>
                  <span className={'visible-sm'}>Type: </span>
                  {notification.type}
                </div>

                <div className={'col-md-4 ellipsis'}>
                  <span className={'visible-sm'}>Event: </span>
                  {notification.event.name}
                </div>

                <div className={'col-md-1 description'}>
                  <img
                    src={plus}
                    alt={'Edit'}
                    className={'edit-icon'}
                    onClick={() =>
                      handleModal({
                        title: notification.title,
                        description: notification.description,
                      })
                    }
                  />
                </div>
              </div>
            );
          })} */}
        {/* {notifications && notifications.length === 0 && !isFetchingNotifications && (
          <div className={'no-results'}>No notifications found</div>
        )} */}
      </div>
      {/* {total > 0 && (
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
      )}      */}
    </div>
  );
};

export { QrPage };
