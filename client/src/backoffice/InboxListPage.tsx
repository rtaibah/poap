import React, { FC, useState, useEffect, ChangeEvent } from 'react';

/* Libraries */
import ReactModal from 'react-modal';
import ReactPaginate from 'react-paginate';

/* Helpers */
import { Notification, getNotifications, getEvents, PoapEvent } from '../api';

/* Components */
import { Loading } from '../components/Loading';

/* Assets */
import gas from '../images/gas-station.svg';

const PAGE_SIZE = 10;

type PaginateAction = {
  selected: number;
};

const InboxListPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [notificationType, setNotificationType] = useState<string>('inbox');
  const [recipientFilter, setRecipientFilter] = useState<string>('everyone');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<null | number>(null);
  const [modalText, setModalText] = useState<string>('');
  const [isFetchingNotifications, setIsFetchingNotifications] = useState<null | boolean>(null);
  const [notifications, setNotifications] = useState<null | Notification[]>(null);
  const [events, setEvents] = useState<PoapEvent[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const events = await getEvents();
    setEvents(events);
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, notificationType, recipientFilter]);

  const fetchNotifications = () => {
    setIsFetchingNotifications(true);
    setNotifications(null);

    const event_id = recipientFilter !== 'everyone' ? selectedEvent : null;

    getNotifications(PAGE_SIZE, page * PAGE_SIZE, notificationType, event_id)
      .then(response => {
        if (!response) return;
        setNotifications(response.notifications);
        setTotal(response.total);
      })
      .catch(error => console.error(error))
      .finally(() => setIsFetchingNotifications(false));
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleFilter = (name: string, value: string) => {
    if (name === 'notificationType') {
      setNotificationType(value);
    }
    if (name === 'recipientFilter') {
      setRecipientFilter(value);
    }
  };

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedEvent(Number(e.target.value));
  };

  const handleModal = (event?: string) => {
    if (!modalOpen && event) setModalText(event);
    setModalOpen(!modalOpen);
  };

  return (
    <div className={'admin-table transactions'}>
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
                onChange={() => handleFilter('notificationType', 'inbox')}
                checked={notificationType === 'inbox'}
              />
              <label htmlFor={`inbox`}>Inbox</label>
            </div>
            <div className="filter-option">
              <input
                type={'radio'}
                id={`push`}
                onChange={() => handleFilter('notificationType', 'push')}
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
                onChange={() => handleFilter('recipientFilter', 'everyone')}
                checked={recipientFilter === 'everyone'}
              />
              <label htmlFor={`everyone`}>Sent to everyone</label>
            </div>
            <div className="filter-option">
              <input
                type={'radio'}
                id={`event`}
                onChange={() => handleFilter('recipientFilter', 'event')}
                checked={recipientFilter === 'event'}
              />
              <label htmlFor={`event`}>Sent to the attendees of a an event</label>

              {recipientFilter === 'event' && (
                <select onChange={handleSelect}>
                  {events &&
                    events.map(event => {
                      let label = `${event.name} (${event.fancy_id}) - ${event.year}`;
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
        <div className={'col-md-3'}>Type</div>
        <div className={'col-md-4'}>Event</div>
      </div>
      <div className={'row table-header visible-sm'}>
        <div className={'center'}>Notifications</div>
      </div>
      <div className={'admin-table-row'}>
        {isFetchingNotifications && <Loading />}
        {notifications &&
          notifications.map((notification, i) => {
            return (
              <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={notification.id}>
                <div className={'col-md-1 center'}>
                  <span className={'visible-sm'}>#</span>
                  {notification.id}
                </div>

                <div className={'col-md-4'}>
                  <span className={'visible-sm'}>Title: </span>
                  {notification.title}
                </div>

                <div className={'col-md-3'}>
                  <span className={'visible-sm'}>Type: </span>
                  {notification.type}
                </div>

                <div className={'col-md-4'}>
                  <span className={'visible-sm'}>Event: </span>
                  {notification.event.name}
                  <img
                    src={gas}
                    alt={'Edit'}
                    className={'edit-icon'}
                    onClick={() => handleModal(notification.event.description)}
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
          />
        </div>
      )}
      <ReactModal isOpen={modalOpen} shouldFocusAfterRender={true}>
        <div>
          <h3>Description</h3>
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
