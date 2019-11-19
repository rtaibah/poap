import React, { useState, useEffect, useMemo } from 'react';
import { Link, Switch, Route, RouteComponentProps } from 'react-router-dom';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps } from 'formik';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
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

const CreateEventForm: React.FC = () => {
  return <EventForm create />;
};

const EditEventForm: React.FC<
  RouteComponentProps<{
    eventId: string;
  }>
> = ({ location, match }) => {
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

  return (
    <div className={'bk-container'}>
      <h2>Events</h2>
      <Link to="/admin/events/new">
        <button className="bk-btn" style={{ margin: '30px 0px' }}>
          Create New
        </button>
      </Link>
      {fetchingEvents ? (
        <div>Fetching Events...</div>
      ) : fetchEventsError || events == null ? (
        <div>There was a problem fetching events</div>
      ) : (
        <div>
          {events.map(e => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
};

const EventRow: React.FC<{ event: PoapEvent }> = ({ event }) => {
  return (
    <div className="bk-eventrow">
      <div>
        <p>
          {event.name} - {event.year}
        </p>
        <p>{event.fancy_id}</p>
        <p>{event.signer && event.signer_ip ? 'Active' : 'Inactive'}</p>
      </div>
      <div>
        <Link to={{ pathname: `/admin/events/${event.fancy_id}`, state: event }}>
          <button className="bk-btn">Edit</button>
        </Link>
      </div>
    </div>
  );
};
