import { authClient } from './auth';

export type Address = string;
export interface TokenInfo {
  tokenId: string;
  owner: string;
  event: PoapEvent;
  ownerText?: string;
}
export interface PoapEvent {
  id: number;
  fancy_id: string;
  signer: Address;
  signer_ip: string;
  name: string;
  description: string;
  city: string;
  country: string;
  event_url: string;
  image_url: string;
  year: number;
  start_date: string;
  end_date: string;
}
export interface Claim extends ClaimProof {
  claimerSignature: string;
}
export interface ClaimProof {
  claimId: string;
  eventId: number;
  claimer: Address;
  proof: string;
}
export interface PoapSetting {
  id: number;
  name: string;
  type: string;
  value: string;
}
export interface AdminAddress {
  id: number;
  signer: Address;
  role: string;
  gas_price: string;
  balance: string;
  created_date: string;
}
export interface Transaction {
  id: number;
  tx_hash: string;
  nonce: number;
  operation: string;
  arguments: string;
  created_date: string;
  gas_price: string;
  signer: string;
  status: string;
}
export interface PaginatedTransactions {
  limit: number;
  offset: number;
  total: number;
  transactions: Transaction[]
}

export type ENSQueryResult = { valid: false } | { valid: true; address: string };

export type AddressQueryResult = { valid: false } | { valid: true; ens: string };

const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://api.poap.xyz';

async function fetchJson<A>(input: RequestInfo, init?: RequestInit): Promise<A> {
  const res = await fetch(input, init);
  if (res.ok) {
    return await res.json();
  } else {
    console.error(res);
    throw new Error(`Error with request statusCode: ${res.status}`);
  }
}

async function secureFetchNoResponse(input: RequestInfo, init?: RequestInit): Promise<void> {
  const bearer = 'Bearer ' + (await authClient.getAPIToken());
  const res = await fetch(input, {
    ...init,
    headers: {
      Authorization: bearer,
      ...(init ? init.headers : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request Failed => statusCode: ${res.status} msg: ${res.statusText}`);
  }
}

export function resolveENS(name: string): Promise<ENSQueryResult> {
  return fetchJson(`${API_BASE}/actions/ens_resolve?name=${encodeURIComponent(name)}`);
}

export function getENSFromAddress(address: Address): Promise<AddressQueryResult> {
  return fetchJson(`${API_BASE}/actions/ens_lookup/${address}`);
}

export function getTokensFor(address: string): Promise<TokenInfo[]> {
  return fetchJson(`${API_BASE}/actions/scan/${address}`);
}

export function getTokenInfo(tokenId: string): Promise<TokenInfo> {
  return fetchJson(`${API_BASE}/token/${tokenId}`);
}

export async function getEvents(): Promise<PoapEvent[]> {
  return fetchJson(`${API_BASE}/events`);
}

export async function getEvent(fancyId: string): Promise<null | PoapEvent> {
  return fetchJson(`${API_BASE}/events/${fancyId}`);
}

export async function getSetting(settingName: string): Promise<null | PoapSetting> {
  return fetchJson(`${API_BASE}/settings/${settingName}`);
}

export async function getTokenInfoWithENS(tokenId: string): Promise<TokenInfo> {
  const token = await getTokenInfo(tokenId);

  try {
    const ens = await getENSFromAddress(token.owner);
    const ownerText = ens.valid ? `${ens.ens} (${token.owner})` : `${token.owner}`;
    const tokenParsed = { ...token, ens, ownerText };
    return tokenParsed;
  } catch (error) {
    return token;
  }
}

export async function claimToken(claim: Claim): Promise<void> {
  const res = await fetch(`${API_BASE}/actions/claim`, {
    method: 'POST',
    body: JSON.stringify(claim),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    console.error(res);
    throw new Error(`Error with request statusCode: ${res.status}`);
  }
}

export async function checkSigner(signerIp: string, eventId: number): Promise<boolean> {
  try {
    const res = await fetch(`${signerIp}/check`);
    if (!res.ok) {
      return false;
    }
    const body = await res.json();
    return body.eventId === eventId;
  } catch (err) {
    return false;
  }
}

export async function requestProof(
  signerIp: string,
  eventId: number,
  claimer: string
): Promise<ClaimProof> {
  return fetchJson(`${signerIp}/api/proof`, {
    method: 'POST',
    body: JSON.stringify({ eventId, claimer }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export function setSetting(settingName: string, settingValue: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/settings/${settingName}/${settingValue}`, {
    method: 'PUT',
  });
}

export function burnToken(tokenId: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/burn/${tokenId}`, {
    method: 'POST',
  });
}

export async function mintEventToManyUsers(eventId: number, addresses: string[]): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/actions/mintEventToManyUsers`, {
    method: 'POST',
    body: JSON.stringify({
      eventId,
      addresses,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}
export async function mintUserToManyEvents(eventIds: number[], address: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/actions/mintUserToManyEvents`, {
    method: 'POST',
    body: JSON.stringify({
      eventIds,
      address,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateEvent(event: PoapEvent) {
  return secureFetchNoResponse(`${API_BASE}/events/${event.fancy_id}`, {
    method: 'PUT',
    body: JSON.stringify(event),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function createEvent(event: PoapEvent) {
  return secureFetchNoResponse(`${API_BASE}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getSigners(): Promise<AdminAddress[]> {
  // return fetchJson('http://www.mocky.io/v2/5d8ba987350000e004d4718d');
  return fetchJson(`${API_BASE}/signers`);
}

export function setSigner(id: number, gasPrice: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/signers`, {
    method: 'PUT',
    body: JSON.stringify({id, gas_price: gasPrice})
  });
}

export function getTransactions(limit: number, offset: number): Promise<PaginatedTransactions> {
  // return fetchJson(`http://www.mocky.io/v2/5d8d03582e00005100abde66?limit=${limit}&offset=${offset}`);
  return fetchJson(`${API_BASE}/transactions?limit=${limit}&offset=${offset}`);
}