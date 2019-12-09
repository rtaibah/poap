import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps, FormikActions } from 'formik';
import { InboxFormSchema } from '../lib/schemas';

/* Helpers */
import { getEvents, PoapEvent, sendNotification } from '../api';

/* Components */
import { SubmitButton } from '../components/SubmitButton';
import FilterSelect from '../components/FilterSelect';

/* Typings */
import { Value, Name, EmptyValue } from '../types';

type IInboxFormValues = {
  title: string;
  description: string;
  recipientFilter: Exclude<Value, 'inbox' | 'push'>;
  selectedEvent: number | null;
  notificationType: Exclude<Value, 'everyone' | 'event'>;
};

export const InboxPage: React.FC = () => {
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [notificationType, setNotificationType] = useState<string>('');
  const [recipientFilter, setRecipientFilter] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<number | null>();

  useEffect(() => {
    const async = async () => {
      const events = await getEvents();
      setEvents(events);
    };
    async();
  }, []);

  const initialValues: IInboxFormValues = {
    title: '',
    description: '',
    notificationType: 'inbox',
    recipientFilter: 'everyone',
    selectedEvent: null,
  };

  useEffect(() => {
    console.log(recipientFilter);
  }, [recipientFilter]);

  useEffect(() => {
    console.log(notificationType);
  }, [notificationType]);

  useEffect(() => {
    console.log(selectedEvent);
  }, [selectedEvent]);

  const handleSubmit = async (
    values: IInboxFormValues,
    actions: FormikActions<IInboxFormValues>
  ) => {
    const { title, description, notificationType } = values;

    try {
      actions.setStatus(null);
      console.log('llego');
      await sendNotification(title, description, notificationType, Number(selectedEvent));
      actions.setStatus({
        ok: true,
        msg: `Notification sent`,
      });
    } catch (err) {
      actions.setStatus({
        ok: false,
        msg: `Failed to send notification: ${err.message}`,
      });
    } finally {
      actions.setSubmitting(false);
    }
  };

  const handleRadio = (name: Name, value: Value | EmptyValue) => {
    if (name === 'notificationType') setNotificationType(value);
    if (name === 'recipientFilter') setRecipientFilter(value);
  };

  const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>, setFieldValue: any) => {
    setSelectedEvent(Number(e.target.value));
    setFieldValue('selectedEvent', Number(e.target.value));
  };

  const handleNotificationTypeSelect = (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: any
  ) => {
    const { value } = e.target;

    if (value === '') {
      handleRadio('notificationType', value);
      setFieldValue('notificationType', value);
    }
    if (value === 'inbox') {
      handleRadio('notificationType', value);
      setFieldValue('notificationType', value);
    }
    if (value === 'push') {
      handleRadio('notificationType', value);
      setFieldValue('notificationType', value);
    }
  };

  const handleRecipientSelect = (e: React.ChangeEvent<HTMLSelectElement>, setFieldValue: any) => {
    const { value } = e.target;

    if (value === '') {
      handleRadio('recipientFilter', value);
      setFieldValue('recipientFilter', value);
    }
    if (value === 'everyone') {
      handleRadio('recipientFilter', value);
      setFieldValue('recipientFilter', value);
    }
    if (value === 'event') {
      handleRadio('recipientFilter', value);
      setFieldValue('recipientFilter', value);
    }
  };

  return (
    <div className="bk-container">
      <Formik
        enableReinitialize
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={InboxFormSchema}
        render={({ dirty, isValid, isSubmitting, status, setFieldValue }) => {
          return (
            <>
              <Field
                name="title"
                render={({ field, form }: FieldProps) => (
                  <div className="bk-form-row">
                    <label htmlFor="title">Title</label>
                    <input
                      type="text"
                      name="title"
                      {...field}
                      className={classNames(!!form.errors[field.name] && 'error')}
                    />
                    <ErrorMessage name={'title'} component="p" className="bk-error" />
                  </div>
                )}
              />

              <div className="bk-form-row">
                <label htmlFor="description">Description</label>
                <Field
                  name="description"
                  render={({ field, form }: FieldProps) => (
                    <textarea
                      rows={10}
                      cols={24}
                      placeholder=""
                      className={classNames(!!form.errors[field.name] && 'error')}
                      {...field}
                    />
                  )}
                />
                <ErrorMessage name="description" component="p" className="bk-error" />
                <br />
              </div>

              <div className="row">
                <div className="col-md-3 ">
                  <FilterSelect handleChange={e => handleNotificationTypeSelect(e, setFieldValue)}>
                    <option value="">Select a type</option>
                    <option value="inbox">Inbox</option>
                    <option value="push">Push</option>
                  </FilterSelect>
                </div>

                <div className="col-md-3">
                  <FilterSelect handleChange={e => handleRecipientSelect(e, setFieldValue)}>
                    <option value="">Select the recipient</option>
                    <option value="everyone">Send to everyone</option>
                    <option value="event">Send to specific event</option>
                  </FilterSelect>
                </div>

                <div className="col-md-3">
                  {recipientFilter === 'event' && events && (
                    <FilterSelect handleChange={e => handleEventSelect(e, setFieldValue)}>
                      <option value="">Select an event</option>
                      {events &&
                        events.map((event: PoapEvent) => {
                          const label = `${event.name} (${event.fancy_id}) - ${event.year}`;
                          return (
                            <option key={event.id} value={event.id}>
                              {label}
                            </option>
                          );
                        })}
                    </FilterSelect>
                  )}
                </div>
              </div>

              <SubmitButton text="Send" isSubmitting={isSubmitting} canSubmit={true} />

              {status && (
                <div className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</div>
              )}
            </>
          );
        }}
      />
    </div>
  );
};

// const Radio: React.FC<RadioProps> = props => {
//   return (
//     <Field name={props.name}>
//       {({ field, form }: FieldProps) => (
//         <label>
//           <input
//             type={'radio'}
//             checked={field.value === props.value}
//             onChange={() => {
//               if (field.value !== props.value) {
//                 form.setFieldValue(props.name, props.value);

//                 if (props.name === 'notificationType') return;

//                 props.events
//                   ? form.setFieldValue('selectedEvent', props.events[0].id)
//                   : form.setFieldValue('selectedEvent', null);
//               }
//             }}
//           />
//           {props.label}
//         </label>
//       )}
//     </Field>
//   );
// };

{
  /* <div className="bk-form-row">
                <label>Filter recipient:</label>
                <div>
                  <Radio name="recipientFilter" value={'everyone'} label={'Send to everyone'} />
                  <Radio
                    name="recipientFilter"
                    value={'event'}
                    label={'Send to the attendees of a an event'}
                    events={events}
                  />
                </div>
                <ErrorMessage name="recipientFilter" component="p" className="bk-error" />
              </div>

              {values.recipientFilter === 'event' && (
                <div className="bk-form-row">
                  <label htmlFor="selectedEventId">Choose Event:</label>
                  <Field name="selectedEventId" component="select">
                    {events.map(event => {
                      const label = `${event.name} (${event.fancy_id}) - ${event.year}`;
                      return (
                        <option key={event.id} value={event.id}>
                          {label}
                        </option>
                      );
                    })}
                  </Field>
                  <ErrorMessage name="selectedEventId" component="p" className="bk-error" />
                </div>
              )}

              <div className="bk-form-row">
                <label>Notification type:</label>
                <div>
                  <Radio name="notificationType" value={'inbox'} label={'Inbox'} />
                  <Radio name="notificationType" value={'push'} label={'Push notification'} />
                </div>
                <ErrorMessage name="notificationType" component="p" className="bk-error" />
              </div> */
}
