const ROUTES = {
  home: '/',
  scan: '/scan/:account',
  token: '/token/:tokenId',
  callback: '/callback',
  signerClaimPage: '/signer/claim/:event',
  codeClaimPageHash: '/claim/:hash',
  codeClaimPage: '/claim',
  admin: '/admin',
  issueForEvent: '/admin/issue-for-event',
  issueForUser: '/admin/issue-for-user',
  events: '/admin/events',
  eventsNew: '/admin/events/new',
  event: '/admin/events/:eventId',
  minters: '/admin/minters',
  burn: '/admin/burn',
  addressManagement: '/admin/address-management',
  transactions: '/admin/transactions',
  inbox: '/admin/inbox'
};

const TX_STATUS = {
  failed: 'failed',
  passed: 'passed',
  pending: 'pending',
};

const ETHERSCAN_URL = 'https://etherscan.io';

const etherscanLinks = {
  tx: (hash: string): string => `https://etherscan.io/tx/${hash}`,
  address: (address: string): string => `https://etherscan.io/address/${address}`,
};

export { ROUTES, TX_STATUS, etherscanLinks };
