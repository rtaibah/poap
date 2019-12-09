/* eslint jsx-a11y/anchor-is-valid: 0 */
import React, { useCallback, useContext, useState, useEffect } from 'react';
import { Link, Redirect, Route, withRouter, Switch } from 'react-router-dom';
import { slide as Menu } from 'react-burger-menu';

// lib
import { AuthContext, authClient } from '../auth';

/* Assets */
import PoapLogo from '../images/POAP.svg';
import Calendar from '../images/calendar.svg';
import Qr from '../images/qr-code.svg';

/* Constants */
import { ROUTES, ROLES, LABELS } from '../lib/constants';

/* Components */
import { BurnPage } from './BurnPage';
import { IssueForEventPage, IssueForUserPage } from './IssuePage';
import { AddressManagementPage } from './AddressManagementPage';
import { TransactionsPage } from './TransactionsPage';
import { InboxPage } from './InboxPage';
import { InboxListPage } from './InboxListPage';
import { QrPage } from './QrPage';
import { EventsPage } from './EventsPage';
// import { EventList, CreateEventForm, EditEventForm } from './EventsPage';

export const MintersPage = () => <div> This is a MintersPage </div>;

type RouteProps = {
  path: string;
  roles: string[];
  title?: string;
};

type LabelProps = {
  roles: string[];
  title: string;
};

const Label: React.FC<{ label: LabelProps }> = ({ label }) => {
  const { title } = label;
  return <h2>{title}</h2>;
};

const RoleLink: React.FC<{ route: RouteProps; handleClick: () => void }> = ({
  route,
  handleClick,
}) => {
  const { path, title } = route;
  if (typeof route === 'object' && title) {
    return (
      <Link className={'bm-item'} to={path} onClick={handleClick}>
        {title}
      </Link>
    );
  }

  return null;
};

type Roles = {
  roles: string[];
};

export const withRole = <T extends Object>(
  WrappedComponent: React.ComponentType<T>
): React.FC<T & Roles> => {
  return (props: Roles & T) => {
    const userRole = authClient.getRole();

    if (!props.roles.includes(userRole)) return null;

    return <WrappedComponent {...props} />;
  };
};

const LabelWithRole = withRole(Label);
const RoleLinkWithRole = withRole(RoleLink);

const NavigationMenu = withRouter(({ history }) => {
  const auth = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const userRole = authClient.getRole();

    if (userRole === ROLES.eventHost) return;

    const { pathname } = history.location;
    if (pathname === '/admin' || pathname === '/admin/') setIsOpen(true);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <Menu isOpen={isOpen} onStateChange={state => setIsOpen(state.isOpen)} right disableAutoFocus>
      <LabelWithRole roles={LABELS.issueBadges.roles} label={LABELS.issueBadges} />

      <RoleLinkWithRole
        roles={ROUTES.issueForEvent.roles}
        route={ROUTES.issueForEvent}
        handleClick={closeMenu}
      />

      <RoleLinkWithRole
        roles={ROUTES.issueForUser.roles}
        route={ROUTES.issueForUser}
        handleClick={closeMenu}
      />
      <LabelWithRole roles={ROUTES.inbox.roles} label={LABELS.inbox} />

      <RoleLinkWithRole roles={ROUTES.inbox.roles} route={ROUTES.inbox} handleClick={closeMenu} />

      <RoleLinkWithRole
        roles={ROUTES.inboxList.roles}
        route={ROUTES.inboxList}
        handleClick={closeMenu}
      />

      <LabelWithRole roles={LABELS.otherTasks.roles} label={LABELS.otherTasks} />

      <LabelWithRole roles={LABELS.quickLinks.roles} label={LABELS.quickLinks} />

      <RoleLinkWithRole
        roles={ROUTES.addressManagement.roles}
        route={ROUTES.addressManagement}
        handleClick={closeMenu}
      />

      <RoleLinkWithRole roles={ROUTES.events.roles} route={ROUTES.events} handleClick={closeMenu} />

      <RoleLinkWithRole roles={ROUTES.qr.roles} route={ROUTES.qr} handleClick={closeMenu} />

      <RoleLinkWithRole roles={ROUTES.burn.roles} route={ROUTES.burn} handleClick={closeMenu} />

      <RoleLinkWithRole
        roles={ROUTES.transactions.roles}
        route={ROUTES.transactions}
        handleClick={closeMenu}
      />

      <a
        className="bm-item"
        href=""
        onClick={() => {
          auth.logout();
          // history.push('/');
        }}
      >
        Logout
      </a>
    </Menu>
  );
});

const Landing = () => (
  <div className={'cards-container'}>
    <Link to={ROUTES.events.path} className={'card card-link'}>
      <h3>Manage Events</h3>
      <img className={'icon'} src={Calendar} alt={'Manage Events'} />
    </Link>
    <Link to={ROUTES.qr.path} className={'card card-link'}>
      <h3>Manage QR Codes</h3>
      <img className={'icon'} src={Qr} alt={'Manage QR Codes'} />
    </Link>
  </div>
);

const IssueForEventPageWithRole = withRole(IssueForEventPage);
const IssueForUserPageWithRole = withRole(IssueForUserPage);
// const EventsPageWithRole = withRole(EventsPage);
const QrPageWithRole = withRole(QrPage);
const InboxListPageWithRole = withRole(InboxListPage);
const TransactionsPageWithRole = withRole(TransactionsPage);
const MintersPageWithRole = withRole(MintersPage);
const BurnPageWithRole = withRole(BurnPage);
const InboxPageWithRole = withRole(InboxPage);
const AddressManagementPageWithRole = withRole(AddressManagementPage);

export const BackOffice: React.FC = () => (
  <>
    <NavigationMenu />

    <header id="site-header" role="banner">
      <div className="container">
        <div className="col-xs-6 col-sm-6 col-md-6">
          <Link to="/" className="logo">
            <img src={PoapLogo} alt="POAP" />
          </Link>
        </div>
        <div className="col-xs-6 col-sm-6 col-md-6">
          <p className="page-title">BackOffice</p>
        </div>
      </div>
    </header>
    <main className="app-content">
      <div className="container">
        <Switch>
          <Route exact path={ROUTES.admin} component={Landing} />

          <Route
            exact
            path={ROUTES.issueForEvent.path}
            render={() => <IssueForEventPageWithRole roles={ROUTES.issueForEvent.roles} />}
          />

          <Route
            exact
            path={ROUTES.issueForUser.path}
            render={() => <IssueForUserPageWithRole roles={ROUTES.issueForUser.roles} />}
          />

          <Route path={ROUTES.events.path} component={EventsPage} />

          <Route
            exact
            path={ROUTES.minters.path}
            render={() => <MintersPageWithRole roles={ROUTES.minters.roles} />}
          />

          <Route
            exact
            path={ROUTES.burn.path}
            render={() => <BurnPageWithRole roles={ROUTES.burn.roles} />}
          />

          <Route
            exact
            path={ROUTES.addressManagement.path}
            render={() => <AddressManagementPageWithRole roles={ROUTES.addressManagement.roles} />}
          />

          <Route
            exact
            path={ROUTES.transactions.path}
            render={() => <TransactionsPageWithRole roles={ROUTES.transactions.roles} />}
          />

          <Route
            exact
            path={ROUTES.inbox.path}
            render={() => <InboxPageWithRole roles={ROUTES.inbox.roles} />}
          />

          <Route
            exact
            path={ROUTES.inboxList.path}
            render={() => <InboxListPageWithRole roles={ROUTES.inboxList.roles} />}
          />

          <Route
            exact
            path={ROUTES.qr.path}
            render={() => <QrPageWithRole roles={ROUTES.qr.roles} />}
          />

          <Route path="*" render={() => <Redirect to="/admin" />} />
        </Switch>
      </div>
    </main>
  </>
);
