const ROLES = {
  super: 'super',
  eventAdmin: 'eventAdmin',
};

const LABELS = {
  issueBadges: {
    roles: [ROLES.super],
    title: 'Issue Badges',
  },
  inbox: {
    roles: [ROLES.super],
    title: 'Inbox',
  },
  otherTasks: {
    roles: [ROLES.super],
    title: 'Other Tasks',
  },
  quickLinks: {
    roles: [ROLES.eventAdmin],
    title: 'Quick Links',
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
  issueForEvent: {
    path: '/admin/issue-for-event',
    roles: [ROLES.super],
    title: 'Many Users',
  },
  issueForUser: {
    path: '/admin/issue-for-user',
    roles: [ROLES.super],
    title: 'Many Events',
  },
  events: {
    path: '/admin/events',
    roles: [ROLES.super, ROLES.eventAdmin],
    title: 'Manage Events',
  },
  eventsNew: {
    path: '/admin/events/new',
    roles: [ROLES.super, ROLES.eventAdmin],
  },
  event: {
    path: '/admin/events/:eventId',
    roles: [ROLES.super, ROLES.eventAdmin],
  },
  minters: {
    path: '/admin/minters',
    roles: [ROLES.super],
  },
  burn: {
    path: '/admin/burn',
    roles: [ROLES.super],
    title: 'Burn Tokens',
  },
  addressManagement: {
    path: '/admin/address-management',
    roles: [ROLES.super],
    title: 'Manage Addresses',
  },
  transactions: {
    path: '/admin/transactions',
    roles: [ROLES.super],
    title: 'Transactions',
  },
  inbox: {
    path: '/admin/inbox',
    roles: [ROLES.super],
    title: 'Send Notification',
  },
  inboxList: {
    path: '/admin/inbox-list',
    roles: [ROLES.super],
    title: 'Notifications List',
  },
  qr: {
    path: '/admin/qr',
    roles: [ROLES.super, ROLES.eventAdmin],
    title: 'Manage QR Codes',
  },
};

const TX_STATUS = {
  failed: 'failed',
  passed: 'passed',
  pending: 'pending',
};

const etherscanLinks = {
  tx: (hash: string): string => `https://etherscan.io/tx/${hash}`,
  address: (address: string): string => `https://etherscan.io/address/${address}`,
};

export { ROLES, ROUTES, TX_STATUS, etherscanLinks, LABELS };
