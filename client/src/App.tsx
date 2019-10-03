import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import { ROUTES } from './lib/constants';
import { AuthProvider, AuthService } from './auth';
import { Callback } from './auth/Callback';
import { PrivateRoute } from './auth/PrivateRoute';
import { BackOffice } from './backoffice/Main';
import { ClaimPage } from './ClaimPage';
import { ScanPage } from './ScanPage';

type AppProps = { auth: AuthService };

const App: React.FC<AppProps> = ({ auth }) => (
  <AuthProvider value={auth}>
    <Router>
      <Switch>
        <Route exact path={ROUTES.callback} component={Callback} />
        <PrivateRoute path={ROUTES.admin} component={BackOffice} />
        <Route path={ROUTES.claimPage} component={ClaimPage} />
        <Route path={ROUTES.home} component={ScanPage} />
      </Switch>
    </Router>
  </AuthProvider>
);

export default App;
