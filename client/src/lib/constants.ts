const ROLES = {
  administrator: 'administrator',
  eventHost: 'event_host',
};

const LABELS = {
  issueBadges: {
    roles: [ROLES.administrator],
    title: 'Issue Badges',
  },
  inbox: {
    roles: [ROLES.administrator],
    title: 'Inbox',
  },
  otherTasks: {
    roles: [ROLES.administrator],
    title: 'Other Tasks',
  },
  quickLinks: {
    roles: [ROLES.eventHost],
    title: 'Quick Links',
  },
  menu: {
    roles: [ROLES.eventHost],
    title: 'Menu',
  },
};

const ROUTES = {
  home: '/',
  scan: '/scan/:account',
  token: '/token/:tokenId',
  callback: '/callback',
  signerClaimPage: '/signer/claim/:event',
  codeClaimPageHash: '/claim/:hash',
  codeClaimPage: '/claim',
  admin: '/admin',
  adminLogin: '/admin/login',
  issueForEvent: {
    path: '/admin/issue-for-event',
    roles: [ROLES.administrator],
    title: 'Many Users',
  },
  issueForUser: {
    path: '/admin/issue-for-user',
    roles: [ROLES.administrator],
    title: 'Many Events',
  },
  events: {
    path: '/admin/events',
    roles: [ROLES.administrator, ROLES.eventHost],
    title: 'Manage Events',
  },
  eventsList: {
    path: '/admin/events/list',
    roles: [ROLES.administrator, ROLES.eventHost],
  },
  eventsNew: {
    path: '/admin/events/new',
    roles: [ROLES.administrator, ROLES.eventHost],
  },
  event: {
    path: '/admin/events/:eventId',
    roles: [ROLES.administrator, ROLES.eventHost],
  },
  minters: {
    path: '/admin/minters',
    roles: [ROLES.administrator],
  },
  burn: {
    path: '/admin/burn',
    roles: [ROLES.administrator],
    title: 'Burn Tokens',
  },
  burnToken: {
    path: '/admin/burn/:tokenId',
    roles: [ROLES.administrator],
    title: 'Burn Token',
  },
  addressManagement: {
    path: '/admin/address-management',
    roles: [ROLES.administrator],
    title: 'Manage Addresses',
  },
  transactions: {
    path: '/admin/transactions',
    roles: [ROLES.administrator],
    title: 'Transactions',
  },
  inbox: {
    path: '/admin/inbox',
    roles: [ROLES.administrator],
    title: 'Send Notification',
  },
  inboxList: {
    path: '/admin/inbox-list',
    roles: [ROLES.administrator],
    title: 'Notifications List',
  },
  qr: {
    path: '/admin/qr',
    roles: [ROLES.administrator, ROLES.eventHost],
    title: 'Manage QR Codes',
  },
};

const IMAGE_SUPPORTED_FORMATS = ['image/png'];

const TX_STATUS = {
  failed: 'failed',
  passed: 'passed',
  pending: 'pending',
};

const etherscanLinks = {
  tx: (hash: string): string => `https://etherscan.io/tx/${hash}`,
  address: (address: string): string => `https://etherscan.io/address/${address}`,
};

export { ROLES, ROUTES, TX_STATUS, etherscanLinks, LABELS, IMAGE_SUPPORTED_FORMATS };
