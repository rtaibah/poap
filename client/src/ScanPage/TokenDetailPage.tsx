import React, { useEffect, useState } from 'react';

// routing
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';

// libraries
import {
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  TwitterIcon,
  TwitterShareButton,
} from 'react-share';

// api
import { getTokenInfo, TokenInfo } from '../api';

// assets
import HeaderShadowDesktopImg from '../images/header-shadow-desktop.svg';
import HeaderShadowImg from '../images/header-shadow.svg';

// utils
import { useBodyClassName } from '../react-helpers';

export const TokenDetailPage: React.FC<RouteComponentProps<{
  tokenId: string;
}>> = ({ location, match }) => {
  const [token, setToken] = useState<null | TokenInfo>(null);

  useBodyClassName('poap-app event-page');

  useEffect(() => {
    const fn = async () => {
      if (location.state) {
        setToken(location.state);
      } else {
        const token = await getTokenInfo(match.params.tokenId);
        setToken(token);
      }
    };
    fn();
  }, [location, match]);

  if (token == null) {
    return (
      <div className="content-event" data-aos="fade-up" data-aos-delay="300">
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="header-events">
        <div className="container">
          <h1>{token.event.name}</h1>
          <p>
            {token.event.city}, {token.event.country}
            <br />
            <b>{token.event.start_date}</b>
          </p>
          <div className="logo-event" data-aos="fade-up">
            {typeof token.event.image_url === 'string' && (
              <img src={token.event.image_url} alt="Event" />
            )}
          </div>
        </div>
      </div>
      <main id="site-main" role="main" className="main-events">
        <div className="image-main">
          <img src={HeaderShadowImg} alt="" className="mobile" />
          <img src={HeaderShadowDesktopImg} alt="" className="desktop" />
        </div>
        <div className="main-content">
          <div className="container">
            <div className="content-event" data-aos="fade-up" data-aos-delay="300">
              <h2>Owner</h2>
              <p className="wallet-number">
                <Link to={`/scan/${token.owner}`}>{token.owner}</Link>
              </p>
              <h2>Brog on the interwebz</h2>
              <ul className="social-icons">
                <li>
                  <TwitterShareButton
                    url={window.location.toString()}
                    title={`Look at my ${token.event.name} badge!`}
                    via="poapxyz"
                  >
                    <TwitterIcon size={40} round iconBgStyle={{ fill: '#6534FF' }} />
                  </TwitterShareButton>
                </li>
                <li>
                  <TelegramShareButton
                    url={window.location.toString()}
                    title={`Look at my ${token.event.name} badge!`}
                  >
                    <TelegramIcon size={40} round iconBgStyle={{ fill: '#6534FF' }} />
                  </TelegramShareButton>
                </li>
                <li>
                  <RedditShareButton
                    url={window.location.toString()}
                    title={`Look at my ${token.event.name} badge!`}
                  >
                    <RedditIcon size={40} round iconBgStyle={{ fill: '#6534FF' }} />
                  </RedditShareButton>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};
