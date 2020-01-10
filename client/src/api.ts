import queryString from 'query-string';

import { authClient } from './auth';

export type Address = string;
export interface TokenInfo {
  tokenId: string;
  owner: string;
  event: PoapEvent;
  ownerText?: string;
}

export type QrCodesListAssignResponse = {
  success: boolean;
  alreadyclaimedQrs: string[];
};
export interface PoapEvent {
  id: number;
  fancy_id: string;
  signer: Address;
  signer_ip: string;
  name: string;
  description: string;
  creator: string;
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
export interface HashClaim {
  id: number;
  qr_hash: string;
  tx_hash: string;
  tx: Transaction;
  event_id: number;
  event: PoapEvent;
  beneficiary: Address;
  signer: Address;
  claimed: boolean;
  claimed_date: string;
  created_date: string;
  tx_status: string;
  secret: string;
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
  pending_tx: number;
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
  transactions: Transaction[];
}

export interface Notification {
  id: number;
  title: string;
  description: string;
  type: string;
  event_id: number;
  event: PoapEvent;
}

export interface PaginatedNotifications {
  limit: number;
  offset: number;
  total: number;
  notifications: Notification[];
}

export type QrCode = {
  beneficiary: string;
  claimed: boolean;
  claimed_date: string;
  created_date: string;
  event_id: number;
  id: number;
  is_active: boolean;
  scanned: boolean;
  numeric_id: number;
  qr_hash: string;
  qr_roll_id: number;
  tx_hash: string;
  event: PoapEvent;
};

export type PaginatedQrCodes = {
  limit: number;
  offset: number;
  total: number;
  qr_claims: QrCode[];
};

export type ENSQueryResult = { valid: false } | { valid: true; ens: string };

export type AddressQueryResult = { valid: false } | { valid: true; ens: string };

const API_BASE =
  process.env.NODE_ENV === 'development'
    ? `${process.env.REACT_APP_TEST_API_ROOT}`
    : `${process.env.REACT_APP_API_ROOT}`;

async function fetchJson<A>(input: RequestInfo, init?: RequestInit): Promise<A> {
  const res = await fetch(input, init);
  if (res.ok) {
    return await res.json();
  }
  if (!res.ok) {
    const data = await res.json();
    if (data && data.message) throw new Error(data.message);
  }

  return await res.json();
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
    const data = await res.json();
    if (data && data.message) throw new Error(data.message);
    throw new Error(`Request failed => statusCode: ${res.status} msg: ${res.statusText}`);
  }
}

async function secureFetch<A>(input: RequestInfo, init?: RequestInit): Promise<A> {
  const bearer = 'Bearer ' + (await authClient.getAPIToken());
  const res = await fetch(input, {
    ...init,
    headers: {
      Authorization: bearer,
      ...(init ? init.headers : {}),
    },
  });
  if (!res.ok) {
    const data = await res.json();
    if (data && data.message) throw new Error(data.message);
    throw new Error(`Request Failed => statusCode: ${res.status} msg: ${res.statusText}`);
  }
  return await res.json();
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
  return authClient.isAuthenticated()
    ? secureFetch(`${API_BASE}/events`)
    : fetchJson(`${API_BASE}/events`);
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

export async function sendNotification(
  title: string,
  description: string,
  notificationType: string,
  selectedEventId: number | null
): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/notifications`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      event_id: selectedEventId ? selectedEventId : null,
      type: notificationType,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function mintEventToManyUsers(
  eventId: number,
  addresses: string[],
  signer_address: string
): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/actions/mintEventToManyUsers`, {
    method: 'POST',
    body: JSON.stringify({
      eventId,
      addresses,
      signer_address,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function mintUserToManyEvents(
  eventIds: number[],
  address: string,
  signer_address: string
): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/actions/mintUserToManyEvents`, {
    method: 'POST',
    body: JSON.stringify({
      eventIds,
      address,
      signer_address,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateEvent(event: FormData, fancyId: string) {
  return secureFetchNoResponse(`${API_BASE}/events/${fancyId}`, {
    method: 'PUT',
    body: event,
  });
}

export async function createEvent(event: FormData) {
  return secureFetchNoResponse(`${API_BASE}/events`, {
    method: 'POST',
    body: event,
  });
}

export async function getSigners(): Promise<AdminAddress[]> {
  return secureFetch(`${API_BASE}/signers`);
}

export function setSigner(id: number, gasPrice: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/signers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gas_price: gasPrice }),
  });
}

export function getNotifications(
  limit: number,
  offset: number,
  type?: string,
  recipientFilter?: string,
  eventId?: number
): Promise<PaginatedNotifications> {
  let paramsObject = { limit, offset };

  if (type) Object.assign(paramsObject, { type });

  if (recipientFilter === 'everyone') {
    Object.assign(paramsObject, { event_id: '' });
  }

  if (recipientFilter === 'event') {
    Object.assign(paramsObject, { event_id: eventId });
  }

  const params = queryString.stringify(paramsObject);

  return secureFetch(`${API_BASE}/notifications?${params}`);
}

export async function getQrCodes(
  limit: number,
  offset: number,
  claimed?: boolean,
  scanned?: boolean,
  event_id?: number
): Promise<PaginatedQrCodes> {
  const params = queryString.stringify(
    { limit, offset, claimed, event_id, scanned },
    { sort: false }
  );
  return secureFetch(`${API_BASE}/qr-code?${params}`);
}

export async function qrCodesRangeAssign(
  from: number,
  to: number,
  eventId: number | null
): Promise<void> {
  return secureFetchNoResponse(`${API_BASE}/qr-code/range-assign`, {
    method: 'PUT',
    body: JSON.stringify({
      numeric_id_min: from,
      numeric_id_max: to,
      event_id: eventId,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function qrCodesListAssign(
  qrHashes: string[],
  eventId: number | null
): Promise<QrCodesListAssignResponse> {
  console.log(eventId);
  return secureFetch(`${API_BASE}/qr-code/list-assign`, {
    method: 'PUT',
    body: JSON.stringify({
      qr_code_hashes: qrHashes,
      event_id: eventId,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function qrCodesSelectionUpdate(
  qrCodesIds: string[],
  eventId: number | null
): Promise<void> {
  return secureFetchNoResponse(`${API_BASE}/qr-code/update`, {
    method: 'PUT',
    body: JSON.stringify({
      qr_code_ids: qrCodesIds,
      event_id: eventId,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export function getTransactions(
  limit: number,
  offset: number,
  status: string
): Promise<PaginatedTransactions> {
  // TODO: use queryString library to avoid sending empty params
  return secureFetch(`${API_BASE}/transactions?limit=${limit}&offset=${offset}&status=${status}`);
}

export function bumpTransaction(tx_hash: string, gasPrice: string): Promise<any> {
  return secureFetchNoResponse(`${API_BASE}/actions/bump`, {
    method: 'POST',
    body: JSON.stringify({ txHash: tx_hash, gasPrice: gasPrice }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getClaimHash(hash: string): Promise<HashClaim> {
  return fetchJson(`${API_BASE}/actions/claim-qr?qr_hash=${hash}`);
}

export async function postClaimHash(
  qr_hash: string,
  address: string,
  secret: string
): Promise<HashClaim> {
  return fetchJson(`${API_BASE}/actions/claim-qr`, {
    method: 'POST',
    body: JSON.stringify({ qr_hash, address, secret }),
    headers: { 'Content-Type': 'application/json' },
  });
}
