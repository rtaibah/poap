import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps } from 'formik';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import { format } from 'date-fns';
import { useToasts } from 'react-toast-notifications';

import { authClient } from '../auth';

// libraries
import ReactPaginate from 'react-paginate';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { Loading } from '../components/Loading';
import FilterButton from '../components/FilterButton';

// assets
import { ReactComponent as EditIcon } from '../images/edit.svg';

/* Helpers */
import { useAsync } from '../react-helpers';
import { PoapEventSchema } from '../lib/schemas';
import {
  getEventsForSpecificUser,
  PoapEvent,
  getEvent,
  getEvents,
  updateEvent,
  createEvent,
} from '../api';

const PAGE_SIZE = 10;

export const CreateEventForm: React.FC = () => {
  console.log('create event form');
  return <EventForm create />;
};

export const EditEventForm: React.FC<RouteComponentProps<{
  eventId: string;
}>> = ({ location, match }) => {
  const [event, setEvent] = useState<null | PoapEvent>(null);

  useEffect(() => {
    const fn = async () => {
      const event = await getEvent(match.params.eventId);
      setEvent(event);
    };
    fn();
  }, [location, match]);

  if (!event) {
    return <div>Loading...</div>;
  }

  return <EventForm event={event} />;
};

type EventEditValues = {
  name: string;
  year: number;
  id: number;
  description: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  event_url: string;
  image: Blob;
  isFile: boolean;
};

type DatePickerDay = 'start_date' | 'end_date';

type SetFieldValue = (field: string, value: any) => void;

const EventForm: React.FC<{ create?: boolean; event?: PoapEvent }> = ({ create, event }) => {
  const startingDate = new Date('1 Jan 1900');
  const endingDate = new Date('1 Jan 2200');
  const dateFormatter = (day: Date | number) => format(day, 'MM-dd-yyyy');

  const { addToast } = useToasts();

  const initialValues = useMemo(() => {
    if (event) {
      return {
        ...event,
        isFile: false,
      };
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const values: EventEditValues = {
        name: '',
        year,
        id: 0,
        description: '',
        start_date: '',
        end_date: '',
        city: '',
        country: '',
        event_url: '',
        image: new Blob(),
        isFile: true,
      };
      return values;
    }
  }, [event]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: SetFieldValue
  ) => {
    event.preventDefault();
    const { files } = event.target;

    if (!files || !files.length) return;

    const firstFile = files[0];
    setFieldValue('image', firstFile);
  };

  const handleDayClick = (day: Date, dayToSetup: DatePickerDay, setFieldValue: SetFieldValue) =>
    setFieldValue(dayToSetup, dateFormatter(day));

  return (
    <div className={'bk-container'}>
      <Formik
        initialValues={initialValues}
        validateOnBlur={false}
        validateOnChange={false}
        validationSchema={PoapEventSchema}
        onSubmit={async (submittedValues, actions) => {
          try {
            actions.setSubmitting(true);
            const formData = new FormData();

            const { isFile, ...othersKeys } = submittedValues;

            Object.entries(othersKeys).forEach(([key, value]) => {
              formData.append(key, typeof value === 'number' ? value.toString() : value);
            });

            await (create
              ? createEvent(formData!)
              : event && updateEvent(formData!, event.fancy_id));
          } catch (err) {
            actions.setSubmitting(false);
            addToast(err.message, {
              appearance: 'error',
              autoDismiss: true,
            });
          }
        }}
      >
        {({ values, errors, isSubmitting, setFieldValue }) => (
          <Form>
            {create ? (
              <>
                <h2>Create Event</h2>
                <EventField disabled={!create} title="Name" name="name" />
              </>
            ) : (
              <>
                <h2>
                  {event!.name} - {event!.year}
                </h2>
                <EventField disabled={!create} title="ID" name="id" />
              </>
            )}
            <EventField disabled={!create} title="Description" type="textarea" name="description" />
            <div className="bk-group">
              <EventField disabled={!create} title="City" name="city" />
              <EventField disabled={!create} title="Country" name="country" />
            </div>
            <div className="bk-group">
              <DayPickerContainer
                text="Start Date:"
                dayToSetup="start_date"
                handleDayClick={handleDayClick}
                setFieldValue={setFieldValue}
                disabledDays={
                  values.end_date ? { from: new Date(values.end_date), to: endingDate } : undefined
                }
              />
              <DayPickerContainer
                text="End Date:"
                dayToSetup="end_date"
                handleDayClick={handleDayClick}
                setFieldValue={setFieldValue}
                disabledDays={
                  values.start_date
                    ? { from: startingDate, to: new Date(values.start_date) }
                    : undefined
                }
              />
            </div>
            <EventField title="Website" name="event_url" />

            <ImageContainer
              text="Upload Image:"
              handleFileChange={handleFileChange}
              setFieldValue={setFieldValue}
              errors={errors}
            />
            {event && typeof event.image_url === 'string' && (
              <div className={'image-edit-container'}>
                <img alt={event.image_url} className={'image-edit'} src={event.image_url} />
              </div>
            )}
            <SubmitButton text="Save" isSubmitting={isSubmitting} canSubmit={true} />
          </Form>
        )}
      </Formik>
    </div>
  );
};

type DatePickerContainerProps = {
  text: string;
  dayToSetup: DatePickerDay;
  handleDayClick: (day: Date, dayToSetup: DatePickerDay, setFieldValue: SetFieldValue) => void;
  setFieldValue: SetFieldValue;
  disabledDays: RangeModifier | undefined;
};
export interface RangeModifier {
  from: Date;
  to: Date;
}

const DayPickerContainer = ({
  text,
  dayToSetup,
  handleDayClick,
  setFieldValue,
  disabledDays,
}: DatePickerContainerProps) => {
  const handleDayChange = (day: Date) => handleDayClick(day, dayToSetup, setFieldValue);

  return (
    <div className="date-picker-container">
      <label>{text}</label>
      <DayPickerInput
        dayPickerProps={{ disabledDays: disabledDays }}
        onDayChange={handleDayChange}
      />
    </div>
  );
};

type ImageContainerProps = {
  text: string;
  handleFileChange: Function;
  setFieldValue: Function;
  errors: any;
};

const ImageContainer = ({ text, handleFileChange, setFieldValue, errors }: ImageContainerProps) => (
  <div className="date-picker-container">
    <label>{text}</label>
    <input
      type="file"
      className={classNames(Boolean(errors.image) && 'error')}
      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e, setFieldValue)}
    />
    <ErrorMessage name="image" component="p" className="bk-error" />
  </div>
);

type EventFieldProps = {
  title: string;
  name: string;
  disabled?: boolean;
  type?: string;
};
const EventField: React.FC<EventFieldProps> = ({ title, name, disabled, type }) => {
  return (
    <Field
      name={name}
      render={({ field, form }: FieldProps) => (
        <div className="bk-form-row">
          <label>{title}:</label>
          {type === 'textarea' && (
            <textarea
              {...field}
              wrap="soft"
              disabled={disabled}
              className={classNames(!!form.errors[name] && 'error')}
            />
          )}
          {type !== 'textarea' && (
            <input
              {...field}
              type={type || 'text'}
              disabled={disabled}
              className={classNames(!!form.errors[name] && 'error')}
            />
          )}
          <ErrorMessage name={name} component="p" className="bk-error" />
        </div>
      )}
    />
  );
};

export const EventList: React.FC = () => {
  const [criteria, setCriteria] = useState<string>('');

  const users = authClient.user['https://poap.xyz/roles'];
  const isAdmin = Array.isArray(users) ? users.includes('administrator') : false;

  const [events, fetchingEvents, fetchEventsError] = useAsync(
    isAdmin ? getEvents : getEventsForSpecificUser
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.target;

    setCriteria(value.toLowerCase());
  };

  return (
    <div className={'bk-container'}>
      <h2>Events</h2>
      <div className="event-top-bar-container">
        <Link to="/admin/events/new">
          <FilterButton text="Create New" />
        </Link>
        <input type="text" placeholder="Search by name" onChange={handleNameChange} />
      </div>
      {fetchingEvents && <Loading />}

      {fetchEventsError && <div>There was a problem fetching events</div>}

      {events && <EventTable criteria={criteria} initialEvents={events} />}
    </div>
  );
};

type PaginateAction = {
  selected: number;
};

type EventTableProps = {
  initialEvents: PoapEvent[];
  criteria: string;
};

const EventTable: React.FC<EventTableProps> = ({ initialEvents, criteria }) => {
  const [events, setEvents] = useState<PoapEvent[]>(initialEvents);
  const [total, setTotal] = useState<number>(events.length);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    setEvents(initialEvents.filter(handleCriteriaFilter));
  }, [criteria]);

  useEffect(() => {
    setTotal(events.length);
  }, [events]);

  useEffect(() => {
    setPage(0);
  }, [total]);

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const eventsToShowManager = (events: PoapEvent[]): PoapEvent[] => {
    if (events.length <= 10) return events;
    return events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  };

  const handleCriteriaFilter = (event: PoapEvent): boolean =>
    event.name.toLowerCase().includes(criteria);

  return (
    <div>
      <div className={'admin-table transactions'}>
        <div className={'row table-header visible-md'}>
          <div className={'col-md-1 center'}>#</div>
          <div className={'col-md-4'}>Name</div>
          <div className={'col-md-2 center'}>Start Date</div>
          <div className={'col-md-2 center'}>End Date</div>
          <div className={'col-md-2 center'}>Image</div>
          <div className={'col-md-1 center'}>Edit</div>
        </div>
        <div className={'admin-table-row'}>
          {eventsToShowManager(events).map((event, i) => (
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
              <div className={'col-md-2 center'}>
                <span>{event.start_date}</span>
              </div>
              <div className={'col-md-2 center'}>
                <span>{event.end_date}</span>
              </div>
              <div className={'col-md-2 center logo-image-container'}>
                <img alt={event.image_url} className={'logo-image'} src={event.image_url} />
              </div>
              <div className={'col-md-1 center event-edit-icon-container'}>
                <Link to={`/admin/events/${event.fancy_id}`}>
                  <EditIcon />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className={'pagination'}>
          {events && events.length > 10 && (
            <ReactPaginate
              pageCount={Math.ceil(total / PAGE_SIZE)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={PAGE_SIZE}
              forcePage={page}
              activeClassName={'active'}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
