import React, { FC, useState, useEffect } from 'react';
import classNames from 'classnames';

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
}

const InboxListPage: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [filterList, setFilterList] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<null | PoapEvent>(null);
  const [isFetchingNotifications, setIsFetchingNotifications] = useState<null | boolean>(null);
  const [notifications, setNotifications] = useState<null | Notification[]>(null);
  const [events, setEvents] = useState<PoapEvent[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [])

  const fetchEvents =  async() => {
    const events = await getEvents();
    setEvents(events);
  }

  useEffect(() => {
    fetchNotifications();
  }, [page, filterList]);

  const fetchNotifications = () => {
    setIsFetchingNotifications(true);
    setNotifications(null);

    getNotifications(PAGE_SIZE, page  * PAGE_SIZE, filterList.join(','))
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

  const handleFilterToggle = (filter: string) => {
    let newFilterList = [...filterList];
    let index = newFilterList.indexOf(filter);
    if (index > -1) {
      newFilterList.splice(index, 1);
    } else {
      newFilterList.push(filter);
    }
    setFilterList(newFilterList)
  };

  const openEditModal = (notification: Notification) => {
    setModalOpen(true);
    setSelectedEvent(notification.event);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className={'admin-table transactions'}>
      <h2>Notifications</h2>
      <div>
        <h4>Filters</h4>
        <div className={'filters'}>
          <div key={'notification-type-filter'} className={'filter'}>
              <input
                  type={'checkbox'}
                  id={`id_notification-type`}
                  onChange={() => handleFilterToggle('notification-type')}
                />
                <label htmlFor={`id_notification-type`}>notification-type</label>
              </div>

              <div key={'event-filter'} className={'filter'}>
                <input
                  type={'checkbox'}
                  id={`id_event`}
                  onChange={() => handleFilterToggle('event')}
                />
                <label htmlFor={`id_event`}>event</label>
              </div>

              <div>
                <select>
                {events && events.map(event => {
                        let label = `${event.name} (${event.fancy_id}) - ${event.year}`;
                        return (
                          <option key={event.id} value={event.id}>
                            {label}
                          </option>
                        );
                      })}
                  </select>

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
        {notifications && notifications.map((notification, i) => {
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
                <img src={gas} alt={'Edit'} className={'edit-icon'} onClick={() => openEditModal(notification)} />
              </div>
            </div>
          )
        })}
        {notifications && notifications.length === 0 && !isFetchingNotifications &&
        <div className={'no-results'}>No notifications found</div>
        }
      </div>
      {total > 0 &&
        <div className={'pagination'}>
          <ReactPaginate
            pageCount={Math.ceil(total/PAGE_SIZE)}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            activeClassName={'active'}
            onPageChange={handlePageChange}
          />
        </div>
      }
      <ReactModal
        isOpen={modalOpen}
        shouldFocusAfterRender={true}
      >
        <div>
          <h3>Edit Gas Price</h3>
          {selectedEvent &&
              <div className={'description'}>
                {selectedEvent.description}
              </div>
          }
          <div onClick={closeEditModal} className={'close-modal'}>
                      Cancel
                    </div>
        </div>
      </ReactModal>
    </div>
  );
};

export { InboxListPage };
