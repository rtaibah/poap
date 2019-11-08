import React from 'react';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps } from 'formik';
import { InboxFormSchema } from '../lib/schemas';

/* Helpers */
import { getEvents, PoapEvent } from '../api';

/* Components */
import { SubmitButton } from '../components/SubmitButton';

interface IInboxState {
  events: PoapEvent[];
  initialValues: IInboxFormValues;
}

interface IInboxFormValues {
  title: string;
  description: string;
  recipientFilter: string;
  selectedEventId: number | null;
  notificationType: string;
}

export class InboxPage extends React.Component<{}, IInboxState> {
  state: IInboxState = {
    events: [],
    initialValues: {
      title: '',
      description: '',
      recipientFilter: 'everyone',
      selectedEventId: null,
      notificationType: 'inbox',
    },
  };

  async componentDidMount() {
    const events = await getEvents();

    this.setState(old => {
      return {
        ...old,
        events,
        initialValues: {
          ...old.initialValues,
          // selectedEventId: events[0].id,
        },
      };
    });
  }

  onSubmit = async () => {
    console.log('submit');
  };

  render() {
    return (
      <div className="bk-container">
        <Formik
          enableReinitialize
          initialValues={this.state.initialValues}
          onSubmit={this.onSubmit}
          validationSchema={InboxFormSchema}
          render={({ dirty, isValid, isSubmitting, status, values }) => {
            return (
              <Form>
                <Field
                  name="title"
                  render={({ field, form }: FieldProps) => (
                    <div className="bk-form-row">
                      <label htmlFor="title">Title</label>
                      <input
                        type="text"
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

                <div className="bk-form-row">
                  <label>Filter recipient:</label>
                  <div>
                    <Radio name="recipientFilter" value={'everyone'} label={'Send to everyone'} />
                    <Radio
                      name="recipientFilter"
                      value={'eventSpecific'}
                      label={'Send to the attendees of a an event'}
                      events={this.state.events}
                    />
                  </div>
                  <ErrorMessage name="recipientFilter" component="p" className="bk-error" />
                </div>

                {values.recipientFilter === 'eventSpecific' && (
                  <div className="bk-form-row">
                    <label htmlFor="selectedEventId">Choose Event:</label>
                    <Field name="selectedEventId" component="select">
                      {this.state.events.map(event => {
                        let label = `${event.name} (${event.fancy_id}) - ${event.year}`;
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
                </div>

                {status && (
                  <div className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</div>
                )}

                <SubmitButton
                  text="Send"
                  isSubmitting={isSubmitting}
                  canSubmit={isValid && dirty}
                />
              </Form>
            );
          }}
        />
      </div>
    );
  }
}

type RadioProps = {
  name: string;
  value: any;
  label: string;
  events?: PoapEvent[];
};

const Radio: React.FC<RadioProps> = props => {
  return (
    <Field name={props.name}>
      {({ field, form }: FieldProps) => (
        <label>
          <input
            type={'radio'}
            checked={field.value === props.value}
            onChange={() => {
              if (field.value !== props.value) {
                form.setFieldValue(props.name, props.value);
                props.events
                  ? form.setFieldValue('selectedEventId', props.events[0].id)
                  : form.setFieldValue('selectedEventId', null);
              }
            }}
          />
          {props.label}
        </label>
      )}
    </Field>
  );
};
