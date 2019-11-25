import createAuth0Client from '@auth0/auth0-spa-js';
import React from 'react';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';

const BASE_URI = `${window.location.protocol}//${window.location.host}`;

export class AuthService {
  private client!: Auth0Client;
  private _isAuthenticated: boolean = false;
  public user!: Promise<User>;

  isAuthenticated() {
    return this._isAuthenticated;
  }

  async init() {
    this.client = await createAuth0Client({
      domain: process.env.REACT_APP_AUTH0_DOMAIN || '',
      client_id: process.env.REACT_APP_AUTH0_CLIENT_ID || '',
      redirect_uri: `${BASE_URI}/callback`,
      audience: process.env.REACT_APP_AUTH0_AUDIENCE || '',
    });
    this._isAuthenticated = await this.client.isAuthenticated();
    this.user = await this.client.getUser();
  }

  async login(onSuccessPath = '/') {
    const nonce = Math.random()
      .toString()
      .slice(2);
    localStorage.setItem(nonce, onSuccessPath);

    await this.client.loginWithRedirect({
      redirect_uri: `${BASE_URI}/callback`,
      appState: nonce,
    });
  }

  async handleCallback() {
    const result = await this.client.handleRedirectCallback();
    this._isAuthenticated = await this.client.isAuthenticated();

    if (result.appState) {
      const resultPath = localStorage.getItem(result.appState) || '/';
      localStorage.removeItem(result.appState);
      return resultPath;
    } else {
      return '/';
    }
  }

  async getAPIToken() {
    const token = await this.client.getTokenSilently();
    console.log(this.user);
    return token;
  }

  logout() {
    this.client.logout({ returnTo: BASE_URI });
  }
}

export const authClient = new AuthService();

export const AuthContext: React.Context<AuthService> = React.createContext<any>(undefined);

export const AuthProvider = AuthContext.Provider;

export function withAuth<P>(
  Component: React.ComponentType<P & { auth: AuthService }>
): React.FC<P> {
  return function AuthComponent(props) {
    return (
      <AuthContext.Consumer>{auth => <Component {...props} auth={auth} />}</AuthContext.Consumer>
    );
  };
}

type User = {
  email: string;
  email_verified: boolean;
  name: string;
  nickname: string;
  picture: string;
  sub: string;
  updated_at: string;
  'https://poap.xyz/roles': string[];
};
