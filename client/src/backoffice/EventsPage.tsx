import React, { useState, useEffect, useMemo, ReactElement } from 'react';
import { Link, Switch, Route, RouteComponentProps } from 'react-router-dom';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps } from 'formik';

// libraries
import ReactPaginate from 'react-paginate';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { Loading } from '../components/Loading';

/* Helpers */
import { useAsync } from '../react-helpers';
import { PoapEventSchema } from '../lib/schemas';
import { getEvents, PoapEvent, getEvent, updateEvent, createEvent } from '../api';
import { ROUTES } from '../lib/constants';

export const EventsPage: React.FC = () => {
  return (
    <Switch>
      <Route exact path={ROUTES.events.path} component={EventList} />
      <Route exact path={ROUTES.eventsNew.path} component={CreateEventForm} />
      <Route exact path={ROUTES.event.path} component={EditEventForm} />
    </Switch>
  );
};

const PAGE_SIZE = 10;

const CreateEventForm: React.FC = () => {
  return <EventForm create />;
};

const EditEventForm: React.FC<RouteComponentProps<{
  eventId: string;
}>> = ({ location, match }) => {
  const [event, setEvent] = useState<null | PoapEvent>(null);

  useEffect(() => {
    const fn = async () => {
      // if (location.state) {
      //   setEvent(location.state);
      // } else {
      const event = await getEvent(match.params.eventId);
      if (event) {
        if (event.signer == null) {
          event.signer = '';
        }
        if (event.signer_ip == null) {
          event.signer_ip = '';
        }
      }
      setEvent(event);
      // }
    };
    fn();
  }, [location, match]);

  if (!event) {
    return <div>Loading...</div>;
  }

  return <EventForm event={event} />;
};

const EventForm: React.FC<{ create?: boolean; event?: PoapEvent }> = ({ create, event }) => {
  const values = useMemo(() => {
    if (event) {
      return {
        ...event,
      };
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const day = now.getDate() < 10 ? `0${now.getDate()}` : now.getDate().toString();
      const month = now.getMonth() < 10 ? `0${now.getMonth()}` : now.getMonth().toString();
      return {
        name: '',
        year: now.getFullYear(),
        id: 0,
        fancy_id: '',
        description: '',
        start_date: `${year}-${month}-${day}`,
        end_date: `${year}-${month}-${day}`,
        city: '',
        country: '',
        event_url: '',
        image_url: '',
        signer_ip: '',
        signer: '',
      };
    }
  }, [event]);
  return (
    <div className={'bk-container'}>
      <Formik
        initialValues={values}
        validationSchema={PoapEventSchema}
        onSubmit={async (values, actions) => {
          try {
            actions.setSubmitting(true);
            await (create ? createEvent(values!) : updateEvent(values!));
          } finally {
            actions.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, isValid, dirty }) => (
          <Form>
            {create ? (
              <>
                <h2>Create Event</h2>
                <EventField disabled={!create} title="Name" name="name" />
                <EventField disabled={!create} title="Year" name="year" />
              </>
            ) : (
              <>
                <h2>
                  {event!.name} - {event!.year}
                </h2>
                <EventField disabled={!create} title="ID" name="id" />
              </>
            )}

            <EventField disabled={!create} title="Fancy ID" name="fancy_id" />
            <EventField disabled={!create} title="Description" name="description" />
            <div className="bk-group">
              <EventField disabled={!create} title="Start Date" name="start_date" />
              <EventField disabled={!create} title="End Date" name="end_date" />
            </div>
            <div className="bk-group">
              <EventField disabled={!create} title="City" name="city" />
              <EventField disabled={!create} title="Country" name="country" />
            </div>
            <EventField title="Website" name="event_url" />
            <EventField title="Image Url" name="image_url" />
            <EventField title="Signer Url" name="signer_ip" />
            <EventField title="Signer Address" name="signer" />

            <SubmitButton text="Save" isSubmitting={isSubmitting} canSubmit={dirty && isValid} />
          </Form>
        )}
      </Formik>
      {!create && <Link to={`/claim/${event!.fancy_id}`}>Go to Claim Page</Link>}
    </div>
  );
};

type EventFieldProps = {
  title: string;
  name: string;
  disabled?: boolean;
};
const EventField: React.FC<EventFieldProps> = ({ title, name, disabled }) => {
  return (
    <Field
      name={name}
      render={({ field, form }: FieldProps) => (
        <div className="bk-form-row">
          <label>{title}:</label>
          <input
            type="text"
            {...field}
            disabled={disabled}
            className={classNames(!!form.errors[name] && 'error')}
          />
          <ErrorMessage name={name} component="p" className="bk-error" />
        </div>
      )}
    />
  );
};

const EventList: React.FC = () => {
  const [events, fetchingEvents, fetchEventsError] = useAsync(getEvents);
  const [criteria, setCriteria] = useState<string>('');

  const handleNameChange = (e: any): void => {
    console.log(e);
    const { value } = e.target;

    setCriteria(value.toLowerCase());
  };

  return (
    <div className={'bk-container'}>
      <h2>Events</h2>
      <Link to="/admin/events/new">
        <button className="bk-btn" style={{ margin: '30px 0px' }}>
          Create New
        </button>
      </Link>
      <input type="text" placeholder="Search by name" onChange={handleNameChange} />
      {fetchingEvents && <Loading />}

      {(fetchEventsError || events === null) && <div>There was a problem fetching events</div>}

      {events !== null && <EventTable criteria={criteria} events={events} />}
    </div>
  );
};

type PaginateAction = {
  selected: number;
};

type EventTableProps = {
  events: PoapEvent[];
  criteria: string;
};

const EventTable: React.FC<EventTableProps> = ({ events, criteria }) => {
  const total = events.length;
  const [page, setPage] = useState<number>(1);

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const eventsToShowManager = (events: PoapEvent[]): PoapEvent[] =>
    events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleCriteriaFilter = (event: PoapEvent): boolean =>
    event.name.toLowerCase().includes(criteria);

  return (
    <div>
      <div className={'admin-table transactions'}>
        <div className={'row table-header visible-md'}>
          <div className={'col-md-1 center'}>#</div>
          <div className={'col-md-4'}>Name</div>
          <div className={'col-md-3'}>Start Date</div>
          <div className={'col-md-3'}>End Date</div>
          <div className={'col-md-1 center'}>Image</div>
        </div>
        <div className={'admin-table-row'}>
          {eventsToShowManager(events)
            .filter(handleCriteriaFilter)
            .map((event, i) => (
              <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={event.id}>
                <div className={'col-md-1 center'}>
                  <span className={'visible-sm visible-md'}>#</span>
                  {event.id}
                </div>
                <div className={'col-md-4'}>
                  <span>
                    <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                      {event.name}
                    </a>
                  </span>
                </div>
                <div className={'col-md-3'}>
                  <span>{event.start_date}</span>
                </div>
                <div className={'col-md-3'}>
                  <span>{event.end_date}</span>
                </div>
                <div className={'col-md-1 center logo-image-container'}>
                  <img className={'logo-image'} src={event.image_url} />
                </div>
              </div>
            ))}
        </div>
        <div className={'pagination'}>
          <ReactPaginate
            pageCount={Math.ceil(total / PAGE_SIZE)}
            marginPagesDisplayed={2}
            pageRangeDisplayed={PAGE_SIZE}
            activeClassName={'active'}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};
