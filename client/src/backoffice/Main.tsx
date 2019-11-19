/* eslint jsx-a11y/anchor-is-valid: 0 */
import React, { useCallback, useContext, useState, useEffect } from 'react';
import { Link, Route, withRouter } from 'react-router-dom';
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

export const MintersPage = () => <div> This is a MintersPage </div>;

type RouteProps = {
  path: string;
  roles: string[];
  title?: string;
};

const RoleRoute: React.FC<{ route: RouteProps; component: React.FC | React.ComponentClass }> = ({
  route,
  component,
}) => {
  const { path, roles } = route;

  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (roles.includes(userRole)) {
    return <Route path={path} component={component} />;
  }

  return null;
};

const RoleLink: React.FC<{ route: RouteProps; handleClick: () => void }> = ({
  route,
  handleClick,
}) => {
  const { path, title, roles } = route;

  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (typeof route === 'object' && title && roles.includes(userRole)) {
    return (
      <Link className={'bm-item'} to={path} onClick={handleClick}>
        {title}
      </Link>
    );
  }

  return null;
};

type LabelProps = {
  roles: string[];
  title: string;
};

const Label: React.FC<{ label: LabelProps }> = ({ label }) => {
  const { roles, title } = label;

  // TODO: Get user role (Backend WIP)
  const userRole = 'super';

  if (roles.includes(userRole)) return <h2>{title}</h2>;

  return null;
};

const NavigationMenu = withRouter(({ history }) => {
  const auth = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const { pathname } = history.location;
    if (pathname === '/admin' || pathname === '/admin/') setIsOpen(true);
  }, []);

  return (
    <Menu isOpen={isOpen} onStateChange={state => setIsOpen(state.isOpen)} right disableAutoFocus>
      <Label label={LABELS.issueBadges} />
      <RoleLink route={ROUTES.issueForEvent} handleClick={closeMenu} />
      <RoleLink route={ROUTES.issueForUser} handleClick={closeMenu} />

      <Label label={LABELS.inbox} />
      <RoleLink route={ROUTES.inbox} handleClick={closeMenu} />
      <RoleLink route={ROUTES.inboxList} handleClick={closeMenu} />

      <Label label={LABELS.otherTasks} />
      <RoleLink route={ROUTES.addressManagement} handleClick={closeMenu} />
      <RoleLink route={ROUTES.events} handleClick={closeMenu} />
      <RoleLink route={ROUTES.qr} handleClick={closeMenu} />
      <RoleLink route={ROUTES.burn} handleClick={closeMenu} />
      <RoleLink route={ROUTES.transactions} handleClick={closeMenu} />

      {/* <Link to={ROUTES.minters} onClick={closeMenu}>
        Manage Minters
      </Link> */}
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
        <RoleRoute route={ROUTES.issueForEvent} component={IssueForEventPage} />
        <RoleRoute route={ROUTES.issueForUser} component={IssueForUserPage} />
        <RoleRoute route={ROUTES.events} component={EventsPage} />
        <RoleRoute route={ROUTES.minters} component={MintersPage} />
        <RoleRoute route={ROUTES.burn} component={BurnPage} />
        <RoleRoute route={ROUTES.addressManagement} component={AddressManagementPage} />
        <RoleRoute route={ROUTES.transactions} component={TransactionsPage} />
        <RoleRoute route={ROUTES.inbox} component={InboxPage} />
        <RoleRoute route={ROUTES.inboxList} component={InboxListPage} />

        <Route
          exact
          path={ROUTES.admin}
          render={() => <div>Choose an option from the right side menu</div>}
        />
      </div>
    </main>
  </>
);
