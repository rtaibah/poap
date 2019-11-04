export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Address = string;

export type TxStatusPayload = {
  confirmed?: string,
  execution_error?: string
}

export enum OperationType {
  mintToken = 'mintToken',
  mintEventToManyUsers = 'mintEventToManyUsers',
  mintUserToManyEvents = 'mintUserToManyEvents',
  burnToken = 'burnToken',
  vote = 'vote',
}

export enum TransactionStatus {
  pending = 'pending',
  passed = 'passed',
  failed = 'failed',
  bumped = 'bumped',
}

export enum SignerRole {
  administrator = 'administrator',
  standard = 'standard',
}

export interface TokenInfo {
  tokenId: string;
  owner: Address;
  event: PoapEvent;
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

export interface PoapSetting {
  id: number;
  name: string;
  type: string;
  value: string;
}

export interface Signer {
  id: number;
  signer: Address;
  role: SignerRole;
  gas_price: string;
  created_date: Date;
  balance: string;
  pending_tx: number;
}

export interface Transaction {
  id: number;
  tx_hash: string;
  nonce: number;
  signer: Address;
  operation: OperationType;
  arguments: string;
  status: TransactionStatus;
  gas_price: string;
  created_date: Date;
}

export interface ClaimQR {
  id: number;
  qr_hash: string;
  secret: null | string;
  tx_hash: null | string;
  event_id: number;
  event: PoapEvent;
  beneficiary: null | Address;
  signer: null | Address;
  claimed: boolean;
  tx_status: null | TransactionStatus;
  claimed_date: Date;
  created_date: Date;
  is_active: boolean;
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

export interface Vote extends POAPVote {
  claimerSignature: string;
}

export interface POAPVote {
  claimer: Address;
  proposal: number;
}

export interface TaskCreator {
  id: number;
  api_key: string;
  valid_from: Date;
  valid_to: Date;
  description: string;
  task_name: string;
}

export interface Task{
  id: number;
  name: string;
  task_data: object;
  status: string;
  return_data: string;
}

export interface UnlockTask extends Task{
  task_data: {
    accountAddress: Address,
    lockAddress: Address,
    timestamp: Date,
  }
}

export enum Services {
  unlockProtocol = 'unlock-protocol',
}