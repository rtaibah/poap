import React, { FC, useState, useEffect, ChangeEvent } from 'react';

/* Libraries */
import ReactModal from 'react-modal';
import ReactPaginate from 'react-paginate';

/* Helpers */
import { Notification, getNotifications, getEvents, PoapEvent } from '../api';

/* Components */
import { Loading } from '../components/Loading';

/* Assets */
import plus from '../images/plus.svg';

/* Typings */
import { Name, Value } from '../types';

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
};

const InboxListPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [shouldResetPage, setShouldResetPage] = useState<boolean>(false);
  const [notificationType, setNotificationType] = useState<string>('inbox');
  const [recipientFilter, setRecipientFilter] = useState<string>('everyone');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [modalText, setModalText] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [isFetchingNotifications, setIsFetchingNotifications] = useState<null | boolean>(null);
  const [notifications, setNotifications] = useState<null | Notification[]>(null);
  const [events, setEvents] = useState<PoapEvent[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    page !== 0 ? setPage(0) : fetchNotifications();
  }, [notificationType]);

  useEffect(() => {
    setShouldResetPage(true);
  }, [recipientFilter, selectedEvent]);

  useEffect(() => {
    if (shouldResetPage === false) return;
    setShouldResetPage(false);

    if (recipientFilter === 'event' && selectedEvent === undefined) return;
    setSelectedEvent(undefined);

    page !== 0 ? setPage(0) : fetchNotifications();
  }, [shouldResetPage]);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchEvents = async () => {
    const events = await getEvents();
    setEvents(events);
  };

  const fetchNotifications = async () => {
    setIsFetchingNotifications(true);

    let event_id = undefined;
    if (recipientFilter === 'event' && selectedEvent !== undefined) {
      event_id = selectedEvent > -1 ? selectedEvent : undefined;
    }

    try {
      const response = await getNotifications(
        PAGE_SIZE,
        page * PAGE_SIZE,
        notificationType,
        event_id
      );
      if (!response) return;
      setNotifications(response.notifications);
      setTotal(response.total);
    } catch (e) {
      console.log(e);
    } finally {
      setIsFetchingNotifications(false);
    }
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleRadio = (name: Name, value: Value) => {
    if (name === 'notificationType') setNotificationType(value);
    if (name === 'recipientFilter') setRecipientFilter(value);
  };

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(Number(e.target.value));
  };

  const handleModal = (notification?: { title: string; description: string }) => {
    if (!modalOpen && notification) {
      setModalTitle(notification.title);
      setModalText(notification.description);
    }
    setModalOpen(!modalOpen);
  };

  return (
    <div className={'admin-table notifications'}>
      <h2>Notifications</h2>
      <div>
        <h4>Filters</h4>
        <div className={'filters inbox'}>
          <div className={'filter col-md-3'}>
            <label>Notification type:</label>
            <div className="filter-option">
              <input
                type={'radio'}
                id={`inbox`}
                onChange={() => handleRadio('notificationType', 'inbox')}
                checked={notificationType === 'inbox'}
              />
              <label htmlFor={`inbox`}>Inbox</label>
            </div>
            <div className="filter-option">
              <input
                type={'radio'}
                id={`push`}
                onChange={() => handleRadio('notificationType', 'push')}
                checked={notificationType === 'push'}
              />
              <label htmlFor={`push`}>Push notification</label>
            </div>
          </div>

          <div className={'filter col-md-9'}>
            <label>Filter recipient:</label>
            <div className="filter-option">
              <input
                type={'radio'}
                id={`everyone`}
                onChange={() => handleRadio('recipientFilter', 'everyone')}
                checked={recipientFilter === 'everyone'}
              />
              <label htmlFor={`everyone`}>Sent to everyone</label>
            </div>
            <div className="filter-option select">
              <div>
                <input
                  type={'radio'}
                  id={`event`}
                  onChange={() => handleRadio('recipientFilter', 'event')}
                  checked={recipientFilter === 'event'}
                />
                <label htmlFor={`event`}>Sent to the attendees of a an event</label>
              </div>

              {recipientFilter === 'event' && (
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
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={'row table-header visible-md'}>
        <div className={'col-md-1 center'}>#</div>
        <div className={'col-md-4'}>Title</div>
        <div className={'col-md-2'}>Type</div>
        <div className={'col-md-4'}>Event</div>
        <div className={'col-md-1'} />
      </div>
      <div className={'row table-header visible-sm'}>
        <div className={'center'}>Notifications</div>
      </div>
      <div className={'admin-table-row'}>
        {isFetchingNotifications && <Loading />}
        {notifications &&
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
          })}
        {notifications && notifications.length === 0 && !isFetchingNotifications && (
          <div className={'no-results'}>No notifications found</div>
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
      <ReactModal isOpen={modalOpen} shouldFocusAfterRender={true}>
        <div className="admin-list-modal">
          {modalTitle && <h3 className={'title'}>{modalTitle}</h3>}
          {modalText && <div className={'description'}>{modalText}</div>}
          <div onClick={() => handleModal()} className={'close-modal'}>
            Cancel
          </div>
        </div>
      </ReactModal>
    </div>
  );
};

export { InboxListPage };
