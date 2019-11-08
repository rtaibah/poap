/* eslint jsx-a11y/anchor-is-valid: 0 */
import React, { useCallback, useContext, useState } from 'react';
import { Link, Route, withRouter } from 'react-router-dom';
import { slide as Menu } from 'react-burger-menu';

/* Assets */
import PoapLogo from '../images/POAP.svg';
/* Constants */
import { ROUTES } from '../lib/constants';
/* Components */
import { AuthContext } from '../auth';
import { EventsPage } from './EventsPage';
import { BurnPage } from './BurnPage';
import { IssueForEventPage, IssueForUserPage } from './IssuePage';
import { AddressManagementPage } from './AddressManagementPage';
import { TransactionsPage } from './TransactionsPage';
import {InboxPage} from './InboxPage';

export const MintersPage = () => <div> This is a MintersPage </div>;

const NavigationMenu = withRouter(({ history }) => {
  const auth = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <Menu isOpen={isOpen} onStateChange={state => setIsOpen(state.isOpen)} right disableAutoFocus>
      <h2>Issue Badges:</h2>
      <Link to={ROUTES.issueForEvent} onClick={closeMenu}>
        Many Users
      </Link>
      <Link to={ROUTES.issueForUser} onClick={closeMenu}>
        Many Events
      </Link>

      <h2>Other Tasks</h2>
      <Link to={ROUTES.addressManagement} onClick={closeMenu}>
        Manage Addresses
      </Link>
      <Link to={ROUTES.events} onClick={closeMenu}>
        Manage Events
      </Link>
      <Link to={ROUTES.burn} onClick={closeMenu}>
        Burn Tokens
      </Link>
      <Link to={ROUTES.transactions} onClick={closeMenu}>
        Transactions
      </Link>
      {/* <Link to={ROUTES.minters} onClick={closeMenu}>
        Manage Minters
      </Link> */}
      <Link to={ROUTES.inbox} onClick={closeMenu}>
        Send Notification
      </Link>

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
        <Route path={ROUTES.issueForEvent} component={IssueForEventPage} />
        <Route path={ROUTES.issueForUser} component={IssueForUserPage} />
        <Route path={ROUTES.events} component={EventsPage} />
        <Route path={ROUTES.minters} component={MintersPage} />
        <Route path={ROUTES.burn} component={BurnPage} />
        <Route path={ROUTES.addressManagement} component={AddressManagementPage} />
        <Route path={ROUTES.transactions} component={TransactionsPage} />
        <Route path={ROUTES.inbox} component={InboxPage} />
        <Route
          exact
          path={ROUTES.admin}
          render={() => <div>Choose an option from the right side menu</div>}
        />
      </div>
    </main>
  </>
);
