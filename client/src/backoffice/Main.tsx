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

const SidebarLink: React.FC<{ route: RouteProps; handleClick: () => void }> = ({
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

export const withAuthentication = <T extends Object>(
  WrappedComponent: React.ComponentType<T>
): React.FC<T> => {
  return (props: T) => {
    const isAuthenticated = authClient.isAuthenticated();

    if (!isAuthenticated) return <Redirect to="/admin" />;

    return <WrappedComponent {...props} />;
  };
};

const LabelWithAuthentication = withAuthentication(Label);
const SidebarLinkWithAuthentication = withAuthentication(SidebarLink);

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
      <LabelWithAuthentication label={LABELS.issueBadges} />

      <SidebarLinkWithAuthentication route={ROUTES.issueForEvent} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.issueForUser} handleClick={closeMenu} />
      <LabelWithAuthentication label={LABELS.inbox} />

      <SidebarLinkWithAuthentication route={ROUTES.inbox} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.inboxList} handleClick={closeMenu} />

      <LabelWithAuthentication label={LABELS.otherTasks} />

      <LabelWithAuthentication label={LABELS.quickLinks} />

      <SidebarLinkWithAuthentication route={ROUTES.addressManagement} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.events} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.qr} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.burn} handleClick={closeMenu} />

      <SidebarLinkWithAuthentication route={ROUTES.transactions} handleClick={closeMenu} />

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

const IssueForEventPageWithAuthentication = withAuthentication(IssueForEventPage);
const IssueForUserPageWithAuthentication = withAuthentication(IssueForUserPage);
const InboxListPageWithAuthentication = withAuthentication(InboxListPage);
const TransactionsPageWithAuthentication = withAuthentication(TransactionsPage);
const MintersPageWithAuthentication = withAuthentication(MintersPage);
const BurnPageWithAuthentication = withAuthentication(BurnPage);
const InboxPageWithAuthentication = withAuthentication(InboxPage);
const AddressManagementPageWithAuthentication = withAuthentication(AddressManagementPage);

export const BackOffice: React.FC = () => (
  <>
    <NavigationMenu />

    <header id="site-header" role="banner">
      <div className="container">
        <div className="col-xs-6 col-sm-6 col-md-6">
          <Link to="/admin" className="logo">
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

          <Route exact path={ROUTES.qr.path} component={QrPage} />

          <Route path={ROUTES.events.path} component={EventsPage} />

          <Route
            exact
            path={ROUTES.issueForEvent.path}
            render={() => <IssueForEventPageWithAuthentication />}
          />

          <Route
            exact
            path={ROUTES.issueForUser.path}
            render={() => <IssueForUserPageWithAuthentication />}
          />

          <Route
            exact
            path={ROUTES.minters.path}
            render={() => <MintersPageWithAuthentication />}
          />

          <Route exact path={ROUTES.burn.path} render={() => <BurnPageWithAuthentication />} />

          <Route exact path={ROUTES.burnToken.path} render={() => <BurnPageWithAuthentication />} />

          <Route
            exact
            path={ROUTES.addressManagement.path}
            render={() => <AddressManagementPageWithAuthentication />}
          />

          <Route
            exact
            path={ROUTES.transactions.path}
            render={() => <TransactionsPageWithAuthentication />}
          />

          <Route exact path={ROUTES.inbox.path} render={() => <InboxPageWithAuthentication />} />

          <Route
            exact
            path={ROUTES.inboxList.path}
            render={() => <InboxListPageWithAuthentication />}
          />

          <Route path="*" render={() => <Redirect to="/admin" />} />
        </Switch>
      </div>
    </main>
  </>
);
