const ADDRESS_REGEXP = /^0x[0-9a-fA-F]{40}$/;

const ROUTES = {
  home: '/',
  scan: '/scan/:account',
  token: '/token/:account',
  callback: '/callback',
  claimPage: '/claim/:event',
  admin: '/admin',
  issueForEvent: '/admin/issue-for-event',
  issueForUser: '/admin/issue-for-user',
  events: '/admin/events',
  eventsNew: '/admin/events/new',
  event: '/admin/events/:eventId',
  minters: '/admin/minters',
  burn: '/admin/burn',
  addressManagement: '/admin/address-management',
  transactions: '/admin/transactions'
};

const TX_STATUS = {
  failed: 'failed',
  passed: 'passed',
  pending: 'pending'
}

export { ADDRESS_REGEXP, ROUTES, TX_STATUS };
