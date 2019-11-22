import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import delve from 'dlv';

/* Helpers */
import { TokenInfo, getTokensFor, resolveENS, getENSFromAddress } from '../api';
import { isValidAddress } from '../lib/helpers';
/* Assets */
import NoEventsImg from '../images/event-2019.svg';
/* Components */
import { Loading } from '../components/Loading';

type AddressTokensPageState = {
  tokens: null | TokenInfo[];
  address: null | string;
  ens: null | string;
  error: boolean;
  loading: boolean;
};

export class AddressTokensPage extends React.Component<
  RouteComponentProps<{
    account: string;
  }>,
  AddressTokensPageState
> {
  state: AddressTokensPageState = {
    tokens: null,
    error: false,
    address: null,
    ens: null,
    loading: false,
  };

  componentDidMount() {
    this.getTokens();
  }

  async getTokens() {
    try {
      this.setState({ loading: true });

      const { location, match } = this.props;
      const account = delve(match, 'params.account');
      const addressFromHistory = delve(location, 'state.address');
      const address = account || addressFromHistory;

      if (isValidAddress(address)) {
        const tokens = await getTokensFor(address);
        const ens = await getENSFromAddress(address);

        this.setState({ tokens, address, ens: ens.valid ? ens.ens : null });
      } else {
        const ensResponse = await resolveENS(address);

        if (ensResponse.valid) {
          const tokens = await getTokensFor(ensResponse.address);
          this.setState({ tokens, address: ensResponse.address, ens: address });
        }
      }
    } catch (err) {
      this.setState({ error: true });
    } finally {
      this.setState({ loading: false });
    }
  }

  getTokensByYear(): {
    year: number;
    tokens: TokenInfo[];
  }[] {
    if (this.state.tokens == null) {
      throw new Error('There are no tokens');
    }
    const tokensByYear: Map<number, TokenInfo[]> = new Map();
    for (const t of this.state.tokens) {
      if (tokensByYear.has(t.event.year)) {
        tokensByYear.get(t.event.year)!.push(t);
      } else {
        tokensByYear.set(t.event.year, [t]);
      }
    }
    const lastYear = Math.min(...this.state.tokens.map(t => t.event.year));
    const res: {
      year: number;
      tokens: TokenInfo[];
    }[] = [];
    for (let year = new Date().getFullYear(); year >= lastYear; year--) {
      res.push({
        year,
        tokens: tokensByYear.get(year) || [],
      });
    }
    return res;
  }

  renderTokens() {
    return (
      <>
        <p>These are the events you have attended in the past</p>
        {this.getTokensByYear().map(({ year, tokens }, i) => (
          <div key={year} className={classNames('event-year', tokens.length === 0 && 'empty-year')}>
            <h2>{year}</h2>
            {tokens.length > 0 ? (
              <div className="events-logos">
                {tokens.map(t => (
                  <Link
                    key={t.tokenId}
                    to={{
                      pathname: `/token/${t.tokenId}`,
                      state: t,
                    }}
                    className="event-circle"
                    data-aos="fade-up"
                  >
                    {typeof t.event.image === 'string' && (
                      <img src={t.event.image} alt={t.event.name} />
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <img src={NoEventsImg} alt="" />
                <p className="image-description">You’ve been a couch potato all of {year}</p>
              </>
            )}
          </div>
        ))}
      </>
    );
  }

  render() {
    const { error, loading, address, ens, tokens } = this.state;
    const message = ens ? (
      <>
        Hey <span>{ens}!</span> ({address})
      </>
    ) : (
      <>Hey {address}!</>
    );

    return (
      <main id="site-main" role="main" className="app-content">
        <div className="container">
          <div className="content-event years" data-aos="fade-up" data-aos-delay="300">
            {!error && !loading && <h1>{message}</h1>}

            {error && !loading && (
              <div className="bk-msg-error">
                There was an error.
                <br />
                Check the address and try again
              </div>
            )}

            {loading === true && (
              <>
                <Loading />
                <div style={{ textAlign: 'center' }}>Waiting for your tokens... Hang tight</div>
              </>
            )}

            {tokens && tokens.length === 0 && (
              <div className={classNames('event-year', 'empty-year')} style={{ marginTop: '30px' }}>
                <img src={NoEventsImg} alt="" />
                <p className="image-description">
                  You don't seem to have any tokens. You're quite a couch potato!
                </p>
              </div>
            )}

            {tokens && tokens.length > 0 && this.renderTokens()}
          </div>
        </div>
      </main>
    );
  }
}
