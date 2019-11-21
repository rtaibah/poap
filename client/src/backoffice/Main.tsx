/* eslint jsx-a11y/anchor-is-valid: 0 */
import React, { useCallback, useContext, useState, useEffect } from 'react';
import { Link, Route, withRouter, Redirect, Switch } from 'react-router-dom';
import { slide as Menu } from 'react-burger-menu';

/* Assets */
import PoapLogo from '../images/POAP.svg';
/* Constants */
import { ROUTES, ROLES, LABELS } from '../lib/constants';
/* Components */
import { AuthContext } from '../auth';
import { EventsPage } from './EventsPage';
import { BurnPage } from './BurnPage';
import { IssueForEventPage, IssueForUserPage } from './IssuePage';
import { AddressManagementPage } from './AddressManagementPage';
import { TransactionsPage } from './TransactionsPage';
import { InboxPage } from './InboxPage';
import { InboxListPage } from './InboxListPage';
import { QrPage } from './QrPage';
import Calendar from '../images/calendar.svg';
import Qr from '../images/qr-code.svg';

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

const WithRole: React.FC<{ roles: string[] }> = ({ roles, children }) => {
  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (!roles.includes(userRole)) return null;

  return <>{children}</>;
};

const NavigationMenu = withRouter(({ history }) => {
  const auth = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    // TODO: Get user role (Backend WIP)
    const userRole = 'super';

    if (userRole === ROLES.eventAdmin) return;

    const { pathname } = history.location;
    if (pathname === '/admin' || pathname === '/admin/') setIsOpen(true);
  }, []);

  return (
    <Menu isOpen={isOpen} onStateChange={state => setIsOpen(state.isOpen)} right disableAutoFocus>
      <WithRole roles={LABELS.issueBadges.roles}>
        <Label label={LABELS.issueBadges} />
      </WithRole>

      <WithRole roles={ROUTES.issueForEvent.roles}>
        <RoleLink route={ROUTES.issueForEvent} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.issueForUser.roles}>
        <RoleLink route={ROUTES.issueForUser} handleClick={closeMenu} />
      </WithRole>

      <WithRole roles={ROUTES.inbox.roles}>
        <Label label={LABELS.inbox} />
      </WithRole>

      <WithRole roles={ROUTES.inbox.roles}>
        <RoleLink route={ROUTES.inbox} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.inboxList.roles}>
        <RoleLink route={ROUTES.inboxList} handleClick={closeMenu} />
      </WithRole>

      <WithRole roles={LABELS.otherTasks.roles}>
        <Label label={LABELS.otherTasks} />
      </WithRole>

      <WithRole roles={LABELS.quickLinks.roles}>
        <Label label={LABELS.quickLinks} />
      </WithRole>

      <WithRole roles={ROUTES.addressManagement.roles}>
        <RoleLink route={ROUTES.addressManagement} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.events.roles}>
        <RoleLink route={ROUTES.events} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.qr.roles}>
        <RoleLink route={ROUTES.qr} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.burn.roles}>
        <RoleLink route={ROUTES.burn} handleClick={closeMenu} />
      </WithRole>
      <WithRole roles={ROUTES.transactions.roles}>
        <RoleLink route={ROUTES.transactions} handleClick={closeMenu} />
      </WithRole>

      <a
        className="bm-item"
        href=""
        onClick={() => {
          auth.logout();
          history.push('/');
        }}
      >
        Logout
      </a>
    </Menu>
  );
});

const Landing = () => {
  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (userRole === ROLES.super) return <div>Choose an option from the right side menu</div>;

  return (
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
};

const CheckRole: React.FC<{ roles: string[] }> = ({ roles, children }) => {
  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (!roles.includes(userRole)) return null;

  return <>{children}</>;
};

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
            render={() => (
              <CheckRole roles={ROUTES.issueForEvent.roles}>
                <IssueForEventPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.issueForUser.path}
            render={() => (
              <CheckRole roles={ROUTES.issueForUser.roles}>
                <IssueForUserPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.events.path}
            render={() => (
              <CheckRole roles={ROUTES.events.roles}>
                <EventsPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.minters.path}
            render={() => (
              <CheckRole roles={ROUTES.minters.roles}>
                <MintersPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.burn.path}
            render={() => (
              <CheckRole roles={ROUTES.burn.roles}>
                <BurnPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.addressManagement.path}
            render={() => (
              <CheckRole roles={ROUTES.addressManagement.roles}>
                <AddressManagementPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.transactions.path}
            render={() => (
              <CheckRole roles={ROUTES.transactions.roles}>
                <TransactionsPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.inbox.path}
            render={() => (
              <CheckRole roles={ROUTES.inbox.roles}>
                <InboxPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.inboxList.path}
            render={() => (
              <CheckRole roles={ROUTES.inboxList.roles}>
                <InboxListPage />
              </CheckRole>
            )}
          />

          <Route
            exact
            path={ROUTES.qr.path}
            render={() => (
              <CheckRole roles={ROUTES.qr.roles}>
                <QrPage />
              </CheckRole>
            )}
          />

          <Route exact path={'*'} render={() => <Redirect to="/admin" />} />
        </Switch>
      </div>
    </main>
  </>
);
