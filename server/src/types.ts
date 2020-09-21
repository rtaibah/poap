export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Address = string;

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

export enum NotificationType {
  inbox = 'inbox',
  push = 'push',
}

export enum SignerRole {
  administrator = 'administrator',
  standard = 'standard',
}

export enum UserRole {
  administrator = 'administrator',
  event_host = 'event_host',
}

export interface TokenInfo {
  tokenId: string;
  owner: Address;
  event: PoapEvent;
}

export interface EventTemplate {
  id: number;
  name: string;
  title_image: string;
  title_link: string;
  header_link_color: string;
  header_color: string;
  main_color: string;
  footer_icon: string
  header_link_text: string | null;
  header_link_url: string | null;
  footer_color: string | null;
  left_image_url: string | null;
  left_image_link: string | null;
  right_image_url: string | null;
  right_image_link: string | null;
  mobile_image_url: string | null;
  mobile_image_link: string | null;
}

export interface FullEventTemplate extends EventTemplate {
  secret_code: number
}

export interface PoapEvent {
  id: number;
  fancy_id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  event_url: string;
  image_url: string;
  year: number;
  start_date: string;
  end_date: string;
  event_host_id: number | null;
  from_admin: boolean;
  virtual_event: boolean;
  supply?: number;
  event_template_id?: number | null;
}

export interface PoapFullEvent extends PoapEvent{
  secret_code: number
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
  user_input: null | string;
  signer: null | Address;
  claimed: boolean;
  scanned: boolean;
  tx_status: null | TransactionStatus;
  claimed_date: Date;
  created_date: Date;
  is_active: boolean;
  delegated_mint: boolean;
  delegated_signed_message: string;
  event_template?: null | EventTemplate;
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

export interface Notification {
  id: number;
  title: string;
  description: string;
  type: NotificationType;
  event_id: number;
  event: PoapEvent | null;
  created_date: Date;
}

export interface eventHost {
  id: number;
  user_id: string;
}

export interface qrRoll {
  id: number;
  event_host_id: number;
  is_active: boolean;
}

export interface Auth0User {
  'https://poap.xyz/roles': string[],
  iss: number;
  sub: number;
  aud: string[],
  iat: number;
  exp: number;
  azp: string;
  scope: string;
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
