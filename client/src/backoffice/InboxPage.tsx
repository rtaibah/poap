import React from 'react';
import classNames from 'classnames';
import { Formik, Form, Field, ErrorMessage, FieldProps, FormikActions } from 'formik';
import { InboxFormSchema } from '../lib/schemas';

/* Helpers */
import { getEvents, PoapEvent, sendNotification } from '../api';

/* Components */
import { SubmitButton } from '../components/SubmitButton';

/* Typings */
import { Value } from '../types';

interface IInboxState {
  events: PoapEvent[];
  initialValues: IInboxFormValues;
}

interface IInboxFormValues {
  title: string;
  description: string;
  recipientFilter: Exclude<Value, 'inbox' | 'push'>;
  selectedEventId: number | null;
  notificationType: Exclude<Value, 'everyone' | 'event'>;
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

    this.setState({ events });
  }

  onSubmit = async (values: IInboxFormValues, actions: FormikActions<IInboxFormValues>) => {
    const { title, description, notificationType } = values;
    let { selectedEventId } = values;
    if (typeof selectedEventId === 'string') selectedEventId = Number(selectedEventId);

    try {
      actions.setStatus(null);
      await sendNotification(title, description, notificationType, selectedEventId);
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
                      value={'event'}
                      label={'Send to the attendees of a an event'}
                      events={this.state.events}
                    />
                  </div>
                  <ErrorMessage name="recipientFilter" component="p" className="bk-error" />
                </div>

                {values.recipientFilter === 'event' && (
                  <div className="bk-form-row">
                    <label htmlFor="selectedEventId">Choose Event:</label>
                    <Field name="selectedEventId" component="select">
                      {this.state.events.map(event => {
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

                if (props.name === 'notificationType') return;

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
