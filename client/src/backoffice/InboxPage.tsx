import React from 'react'

/* Helpers */
import { getEvents, PoapEvent } from '../api';

interface IInboxState {
  events: PoapEvent[],
  initialValues: IInboxFormValues
}

interface IInboxFormValues {
  title: string,
  description: string,
  forEveryone: boolean,
  selectedEventId: number,
  notificationType: string
}

export class InboxPage extends React.Component<{}, IInboxState> {
  state: IInboxState = {
    events: [],
    initialValues: {
      title: '',
      description: '',
      forEveryone: true,
      selectedEventId: 0,
      notificationType: 'inbox'
    }
  }

  async componentDidMount() {
    const events = await getEvents();

    this.setState(old => {
      return {
        ...old,
        events,
        initialValues: {
          ...old.initialValues,
          selectedEvent: events[1].id,
        },
      };
    });
  }

  render(){
    return (
      <div />
    )
  }
}
