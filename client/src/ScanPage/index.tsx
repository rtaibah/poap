import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RouteComponentProps, Route } from 'react-router';
import { ChooseAddressPage } from './ChooseAddressPage';
import { AddressTokensPage } from './AddressTokensPage';
import { TokenDetailPage } from './TokenDetailPage';

import FooterShadow from '../images/footer-shadow.svg';
import FooterShadowDesktop from '../images/footer-shadow-desktop.svg';
import FooterPattern from '../images/footer-pattern.svg';
import PoapLogo from '../images/POAP.svg';
import BuiltOnEth from '../images/built-on-eth.png';
import { useBodyClassName } from '../react-helpers';

export const ScanPage: React.FC<RouteComponentProps> = ({ match, history }) => {
  const showBadges = useCallback(
    (addressOrENS: string, address: string) => {
      return history.push(`${match.path}scan/${addressOrENS}`, { address });
    },
    [history, match]
  );
  useBodyClassName('poap-app');

  return (
    <div className="landing">
      <ScanHeader />
      <Route
        exact
        path={match.path}
        render={() => <ChooseAddressPage onAccountDetails={showBadges} />}
      />
      <Route path={`${match.path}scan/:account`} component={AddressTokensPage} />
      <Route path={`${match.path}token/:tokenId`} component={TokenDetailPage} />
      <ScanFooter />
    </div>
  );
};

const ScanHeader: React.FC = React.memo(() => (
  <>
    <header id="site-header" role="banner">
      <div className="container">
        <div className="col-xs-6 col-sm-6 col-md-6">
          <Link to="/" className="logo">
            <img src={PoapLogo} alt="POAP" />
          </Link>
        </div>
        <div className="col-xs-6 col-sm-6 col-md-6">
          <p className="page-title">Scan</p>
        </div>
      </div>
    </header>
  </>
));

const ScanFooter: React.FC = React.memo(() => (
  <footer role="contentinfo" className="footer-events">
    <div className="image-footer">
      <img src={FooterShadow} className="mobile" alt="" />
      <img src={FooterShadowDesktop} className="desktop" alt="" />
    </div>
    <div className="footer-content">
      <div className="container">
        <img src={FooterPattern} alt="" className="decoration" />
        <p>
          Powered by <b>POAP</b>
        </p>
        <p>An EthDenver 2019 hack</p>
        <div className="eth-branding">
          <img src={BuiltOnEth} alt="Built on Ethereum" />
        </div>
      </div>
    </div>
  </footer>
));
