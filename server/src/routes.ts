import { FastifyInstance } from 'fastify';
import createError from 'http-errors';
import {
  getEvent,
  getEventByFancyId,
  getEvents,
  updateEvent,
  createEvent,
  getPoapSettingByName,
  getPoapSettings,
  updatePoapSettingByName,
  getTransactions,
  getTotalTransactions,
  getSigners,
  updateSignerGasPrice,
  getQrClaim,
  getTransaction,
  claimQrClaim,
  updateQrClaim,
  checkDualQrClaim,
  getPendingTxsAmount,
  unclaimQrClaim,
  createTask,
  getTaskCreator,
  getNotifications,
  getTotalNotifications,
  createNotification,
  getEventHost,
  getUserEvents,
  getRangeClaimedQr,
  updateEventOnQrRange,
  getEventHostQrRolls,
  getRangeNotOwnedQr,
  getQrRoll,
  getTotalQrClaims,
  getPaginatedQrClaims,
} from './db';

import {
  getAllTokens,
  getTokenInfo,
  mintToken,
  mintEventToManyUsers,
  verifyClaim,
  mintUserToManyEvents,
  burnToken,
  bumpTransaction,
  getAddressBalance,
  resolveName,
  lookupAddress,
  checkAddress,
  checkHasToken,
  getTokenImg,
  getAllEventIds
} from './eth/helpers';

import { Omit, Claim, PoapEvent, TransactionStatus, Address, NotificationType, Notification, ClaimQR } from './types';
import crypto from 'crypto';
import getEnv from './envs';
import * as admin from 'firebase-admin';
import { uploadFile } from './plugins/google-storage-utils';

function sleep(ms: number) {
  return new Promise(resolve=>{
      setTimeout(resolve,ms)
  })
}

function buildMetadataJson(tokenUrl: string, ev: PoapEvent) {
  return {
    description: ev.description,
    external_url: tokenUrl,
    home_url: tokenUrl,
    image: ev.image,
    name: ev.name,
    year: ev.year,
    tags: ['poap', 'event'],
    attributes: [
      {
        trait_type: 'startDate',
        value: ev.start_date,
      },
      {
        trait_type: 'endDate',
        value: ev.end_date,
      },
      {
        trait_type: 'city',
        value: ev.city,
      },
      {
        trait_type: 'country',
        value: ev.country,
      },
      {
        trait_type: 'eventURL',
        value: ev.event_url,
      },
    ],
    properties: [],
  };
}

export default async function routes(fastify: FastifyInstance) {
  fastify.addSchema({
    $id: 'address',
    type: 'string',
    minLength: 42,
    maxLength: 42,
    pattern: '^0x[0-9a-fA-F]{40}$',
  });

  fastify.addSchema({
    $id: 'signature',
    type: 'string',
    minLength: 132,
    maxLength: 132,
    pattern: '^0x[0-9a-fA-F]{130}$',
  });

  fastify.get(
    '/metadata/:eventId/:tokenId',
    {
      schema: {
        description: 'Get metadata json',
        tags: ['Metadata', ],
        params: {
          eventId: {
            type: 'string',
          },
          tokenId: {
            type: 'string',
          },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              description: { type: 'string' },
              external_url: { type: 'string' },
              home_url: { type: 'string' },
              image: { type: 'string' },
              name: { type: 'string' },
              year: { type: 'number' },
              tags:  { type: 'array', items: { type: 'string' }},
              attributes: { 
                type: 'array',
                items: { 
                  type: 'object',
                  properties: {
                    trait_type: { type: 'string' },
                    value: { type: 'string' }
                  }
                }
              },
              properties: { 
                type: 'array',
                items: { 
                  type: 'number',
                }
              },
            }
          }
        }
      },
    },
    async (req, res) => {
      const event = await getEvent(parseInt(req.params.eventId));
      if (!event) {
        throw new createError.NotFound('Invalid Event');
      }
      const tokenUrl = `https://api.poap.xyz/metadata/${req.params.eventId}/${req.params.tokenId}`;
      return buildMetadataJson(tokenUrl, event);
  });

  //********************************************************************
  // ACTIONS
  //********************************************************************

  fastify.get(
    '/actions/ens_resolve',
    {
      schema: {
        description: 'Validate and resolve ENS',
        tags: ['Actions', ],
        querystring: {
          name: { type: 'string' },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              valid: {type: 'boolean'},
              ens:  {type: 'string'}
            }
          }
        }
      },
    },
    async (req, res) => {
      if (req.query['name'] == null || req.query['name'] == '') {
        throw new createError.BadRequest('"name" query parameter is required');
      }
      const resolvedAddress = await resolveName(req.query['name']);

      if (resolvedAddress == null) {
        return {
          valid: false,
        };
      } else {
        return {
          valid: true,
          address: resolvedAddress,
        };
      }
    }
  );

  fastify.get(
    '/actions/ens_lookup/:address',
    {
      schema: {
        description: 'Validate ENS',
        tags: ['Actions', ],
        params: {
          address: {
            type: 'string',
          },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              valid: {type: 'boolean'},
              ens:  {type: 'string'}
            }
          }
        }
      },
    },
    async (req, res) => {
      const address = req.params.address;

      if (address == null || address == '') {
        throw new createError.BadRequest('"address" query parameter is required');
      }

      const resolved = await lookupAddress(address);

      if (resolved == null) {
        return {
          valid: false,
        };
      } else {
        return {
          valid: true,
          ens: resolved,
        };
      }
    }
  );

  fastify.get(
    '/actions/scan/:address',
    {
      schema: {
        description: 'get all address tokens',
        tags: ['Actions', ],
        params: {
          address: 'address#',
        },
        response: {
          200: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                event: {
                  type: 'object',
                  properties: {
                    id: { type: 'number'},
                    fancy_id: { type: 'string'},
                    name: { type: 'string'},
                    event_url: { type: 'string'},
                    image: { type: 'string'},
                    country: { type: 'string'},
                    city: { type: 'string'},
                    description: { type: 'string'},
                    year: { type: 'number'},
                    start_date: { type: 'string'},
                    end_date: { type: 'string'},
                    created_date: { type: 'string'}
                  }
                },
                tokenId: { type: 'string'},
                owner: { type: 'string'}
              }
            }
          }
        }
      },
    },
    async (req, res) => {
      const address = req.params.address;
      const tokens = await getAllTokens(address);
      return tokens;
    }
  );

  fastify.post(
    '/actions/mintEventToManyUsers',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'Endpoint to mint a event to several users',
        tags: ['Actions', ],
        body: {
          type: 'object',
          required: ['eventId', 'addresses', 'signer_address'],
          properties: {
            eventId: { type: 'integer', minimum: 1 },
            addresses: { type: 'array', minItems: 1, items: { type: 'string' } },
            address: {type: 'string'},
            signer: {type: 'string'}
          },
        },
        response: {
          204: { 
            type: 'string',
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      let parsed_addresses: Address[] = []
      for (var address of req.body.addresses) {
        const parsed_address = await checkAddress(address);
        if (!parsed_address) {
          return new createError.BadRequest('Address is not valid');
        }
        parsed_addresses.push(parsed_address);
      }

      await mintEventToManyUsers(req.body.eventId, parsed_addresses, {
        'signer': req.body.signer_address,
        'estimate_mint_gas': parsed_addresses.length
      });
      res.status(204);
      return;
    }
  );

  fastify.post(
    '/actions/mintUserToManyEvents',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'Endpoint to mint a user several events',
        tags: ['Actions', ],
        body: {
          type: 'object',
          required: ['eventIds', 'address', 'signer_address'],
          properties: {
            eventIds: { type: 'array', minItems: 1, items: { type: 'integer', minimum: 1 } },
            address: {type: 'string'},
            signer: {type: 'string'}
          },
        },
        response: {
          204: { 
            type: 'string',
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      const parsed_address = await checkAddress(req.body.address);
      if (!parsed_address) {
        return new createError.BadRequest('Address is not valid');
      }

      await mintUserToManyEvents(req.body.eventIds, parsed_address, {
        'signer': req.body.signer_address,
        'estimate_mint_gas': req.body.eventIds.length
      });
      res.status(204);
      return;
    }
  );

  fastify.post(
    '/actions/claim',
    {
      schema: {
        description: 'POST claim',
        tags: ['Actions', ],
        body: {
          type: 'object',
          required: ['claimId', 'eventId', 'proof', 'claimer', 'claimerSignature'],
          properties: {
            claimId: { type: 'string' },
            eventId: { type: 'integer', minimum: 1 },
            proof: 'signature#',
            claimer: 'address#',
            claimerSignature: 'signature#',
          },
        },
        response: {
          204: { 
            type: 'string',
          }
        }
      },
    },
    async (req, res) => {
      const claim: Claim = req.body;
      const isValid = await verifyClaim(claim);
      if (isValid) {
        await mintToken(claim.eventId, claim.claimer);
        res.status(204);
      } else {
        throw new createError.BadRequest('Invalid Claim');
      }
    }
  );

  fastify.get(
    '/actions/claim-qr',
    {
      schema: {
        description: 'In this endpoint you can ask for the status of a claim, also you have to use this endpoint to get the secret that is needed in the post endpoint',
        tags: ['Actions', ],
        querystring: {
          qr_hash: { type: 'string' },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              id:  { type: 'number'},
              qr_hash: { type: 'string'},
              tx_hash: { type: 'string'},
              event_id: { type: 'number'},
              beneficiary: { type: 'string'},
              signer: { type: 'string'},
              claimed: { type: 'boolean'},
              claimed_date: { type: 'string'},
              created_date: { type: 'string'},
              is_active: { type: 'boolean'},
              event: {
                type: 'object',
                properties: {
                  id: { type: 'number'},
                  fancy_id: { type: 'string'},
                  signer_ip: { type: 'string'},
                  signer: { type: 'string'},
                  name: { type: 'string'},
                  event_url: { type: 'string'},
                  image: { type: 'string'},
                  country: { type: 'string'},
                  city: { type: 'string'},
                  description: { type: 'string'},
                  year: { type: 'number'},
                  start_date: { type: 'string'},
                  end_date: { type: 'string'},
                  created_date: { type: 'string'}
                }
              },
              tx_status: { type: 'string'}
            }
          }
        }
      }
    },
    async (req, res) => {
      const qr_hash = req.query.qr_hash || '';

      if (!qr_hash) {
        return new createError.NotFound('Please send qr_hash as querystring parameter');
      }

      const qr_claim = await getQrClaim(qr_hash);
      if (!qr_claim) {
        await sleep(1000);
        return new createError.NotFound('Qr Claim not found');
      }

      const event = await getEvent(qr_claim.event_id);
      if (!event) {
        return new createError.InternalServerError('Qr Claim does not have any event');
      }
      qr_claim.event = event;

      const env = getEnv();
      qr_claim.secret = crypto.createHmac('sha256', env.secretKey).update(qr_hash).digest('hex');

      qr_claim.tx_status = null;
      if (qr_claim.tx_hash) {
        const transaction_status = await getTransaction(qr_claim.tx_hash);
        if(transaction_status) {
          qr_claim.tx_status = transaction_status.status;
        }
      }

      return qr_claim
    }
  );

  fastify.post(
    '/actions/claim-qr',
    {
      schema: {
        description: 'Using a qr code in this endpoint you can mint and transfer a poap token to a wallet',
        tags: ['Actions', ],
        body: {
          type: 'object',
          required: ['address', 'qr_hash', 'secret'],
          properties: {
            address: { type: 'string'},
            qr_hash: { type: 'string'},
            secret: { type: 'string'},
          }
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              id:  { type: 'number'},
              qr_hash: { type: 'string'},
              tx_hash: { type: 'string'},
              event_id: { type: 'number'},
              beneficiary: { type: 'string'},
              signer: { type: 'string'},
              claimed: { type: 'boolean'},
              claimed_date: { type: 'string'},
              created_date: { type: 'string'},
              is_active: { type: 'boolean'},
              event: {
                type: 'object',
                properties: {
                  id: { type: 'number'},
                  fancy_id: { type: 'string'},
                  signer_ip: { type: 'string'},
                  signer: { type: 'string'},
                  name: { type: 'string'},
                  event_url: { type: 'string'},
                  image: { type: 'string'},
                  country: { type: 'string'},
                  city: { type: 'string'},
                  description: { type: 'string'},
                  year: { type: 'number'},
                  start_date: { type: 'string'},
                  end_date: { type: 'string'},
                  created_date: { type: 'string'}
                }
              },
              tx_status: { type: 'string'}
            }
          }
        }
      },
    },
    async (req, res) => {
      const env = getEnv();
      const secret = crypto.createHmac('sha256', env.secretKey).update(req.body.qr_hash).digest('hex');

      if(req.body.secret != secret) {
        await sleep(1000)
        return new createError.NotFound('Invalid secret');
      }

      const qr_claim = await getQrClaim(req.body.qr_hash);
      if (!qr_claim) {
        await sleep(1000)
        return new createError.NotFound('Qr Claim not found');
      }

      if (qr_claim.claimed) {
        return new createError.BadRequest('Qr is already Claimed');
      }

      let claim_qr_claim = await claimQrClaim(req.body.qr_hash);
      if (!claim_qr_claim) {
        return new createError.InternalServerError('There was a problem updating claim boolean');
      }
      qr_claim.claimed = true

      const event = await getEvent(qr_claim.event_id);
      if (!event) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.InternalServerError('Qr Claim does not have any event');
      }
      qr_claim.event = event

      const parsed_address = await checkAddress(req.body.address);
      if (!parsed_address) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address is not valid');
      }

      const dual_qr_claim = await checkDualQrClaim(qr_claim.event.id, parsed_address);
      if (!dual_qr_claim) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address already has this claim');
      }

      const has_token = await checkHasToken(qr_claim.event.id, parsed_address);
      if (has_token) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.BadRequest('Address already has this claim');
      }

      const tx_mint = await mintToken(qr_claim.event.id, parsed_address, false);
      if (!tx_mint || !tx_mint.hash) {
        await unclaimQrClaim(req.body.qr_hash);
        return new createError.InternalServerError('There was a problem in token mint');
      }

      let set_qr_claim_hash = await updateQrClaim(req.body.qr_hash, parsed_address, tx_mint);
      if (!set_qr_claim_hash) {
        return new createError.InternalServerError('There was a problem saving tx_hash');
      }

      qr_claim.tx_hash = tx_mint.hash
      qr_claim.beneficiary = parsed_address
      qr_claim.signer = tx_mint.from
      qr_claim.tx_status = null

      if (qr_claim.tx_hash) {
        const transaction_status = await getTransaction(qr_claim.tx_hash);
        if(transaction_status) {
          qr_claim.tx_status = transaction_status.status
        }

      }

      return qr_claim
    }
  );

  fastify.post(
    '/actions/bump',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'Endpoint to bump a transaction',
        tags: ['Actions', ],
        body: {
          type: 'object',
          required: ['txHash', 'gasPrice'],
          properties: {
            txHash: { type: 'string' },
            gasPrice: { type: 'string'},
          },
        },
        response: {
          200: { 
            type: 'string',
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      await bumpTransaction(req.body.txHash, req.body.gasPrice);

      res.status(204);
      return;
    }
  );

  fastify.get(
    '/token/:tokenId',
    {
      schema: {
        description: 'Endpoint to get an specific token',
        tags: ['Token', ],
        params: {
          tokenId: { type: 'integer' },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              event: {
                type: 'object',
                properties: {
                  id: { type: 'number'},
                  fancy_id: { type: 'string'},
                  signer_ip: { type: 'string'},
                  signer: { type: 'string'},
                  name: { type: 'string'},
                  event_url: { type: 'string'},
                  image: { type: 'string'},
                  country: { type: 'string'},
                  city: { type: 'string'},
                  description: { type: 'string'},
                  year: { type: 'number'},
                  start_date: { type: 'string'},
                  end_date: { type: 'string'},
                  created_date: { type: 'string'}
                }
              },
              tokenId: { type: 'string'},
              owner: { type: 'string'}
            }
          }
        }
      },
    },
    async (req, res) => {
      const tokenId = req.params.tokenId;
      const tokenInfo = await getTokenInfo(tokenId);
      return tokenInfo;
    }
  );

  fastify.post(
    '/burn/:tokenId',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'Burn Token ID',
        tags: ['Token', ],
        params: {
          tokenId: { type: 'integer' },
        },
        response: {
          204: { type: 'string'},
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      const isOk = await burnToken(req.params.tokenId);
      if (!isOk) {
        return new createError.NotFound('Invalid token or action');
      }
      res.status(204);
      return;
    }
  );

  //********************************************************************
  // SETTINGS
  //********************************************************************
  fastify.get(
    '/settings',
    {
      schema: {
        description: 'Endpoint that list all poap settings',
        tags: ['Settings', ],
        response: {
          200: { 
            type: 'array',
            items: { 
              type: 'object',
              properties: {
                id: { type: 'number'},
                name: { type: 'string'},
                type: { type: 'string'},
                value: { type: 'string'},
                created_date: { type: 'string'}
              }
            },
          }
        }
      },
    },
    async (req, res) => {
      return getPoapSettings();
    }
  );

  fastify.get(
    '/settings/:name',
    {
      schema: {
        description: 'Endpoint to get an specific poap setting',
        tags: ['Settings', ],
        params: {
          name: { type: 'string' },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              id: { type: 'number'},
              name: { type: 'string'},
              type: { type: 'string'},
              value: { type: 'string'},
              created_date: { type: 'string'}
            }
          },
        }
      },
    },
    async (req, res) => {
      const value = await getPoapSettingByName(req.params.name);
      if (!value) {
        return new createError.NotFound('poap setting variable not found');
      }
      return value;
    }
  );

  // TODO Update this endpoint to use value as body parameter
  fastify.put(
    '/settings/:name/:value',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'Endpoint to edit a poap settings',
        tags: ['Settings', ],
        params: {
          name: { type: 'string' },
          value: { type: 'string' },
        },
        response: {
          200: { type: 'string'},
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      // Verify that setting variable exist
      const setting_type = await getPoapSettingByName(req.params.name);
      if (!setting_type) {
        return new createError.BadRequest('unsuccessful operation');
      }

      const isOk = await updatePoapSettingByName(
        req.params.name,
        setting_type['type'],
        req.params.value
      );
      if (!isOk) {
        return new createError.BadRequest('unsuccessful operation');
      }

      res.status(204);
      return;
    }
  );

  //********************************************************************
  // EVENTS
  //********************************************************************

  fastify.get(
    '/events',
    {
      schema: {
        description: 'Endpoint to get all events',
        tags: ['Events', ],
        querystring: {
          user_id: { type: 'string' },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                fancy_id: { type: 'string' },
                name: { type: 'string' },
                event_url: { type: 'string' },
                image: { type: 'string' },
                country: { type: 'string' },
                city: { type: 'string' },
                description: { type: 'string' },
                year: { type: 'number' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
                created_date: { type: 'string' }
              },
            }
          }
        }
      },
    },
    async (req, res) => {
      let events = []
      const user_id = req.query.user_id || null;
      if(user_id) {
        const eventHost = await getEventHost(user_id);
        if (!eventHost) {
          return new createError.NotFound('You are not registered as an event host');
        }
        events = await getUserEvents(eventHost.id);
      } else {
        events = await getEvents();
      }

      return events;
    }
  );

  fastify.get(
    '/events/:fancyid',
    {
      schema: {
        description: 'Endpoint to get an specific event',
        tags: ['Events', ],
        params: {
          fancyid: { type: 'string' },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              id: { type: 'number' },
              fancy_id: { type: 'string' },
              name: { type: 'string' },
              event_url: { type: 'string' },
              image: { type: 'string' },
              country: { type: 'string' },
              city: { type: 'string' },
              description: { type: 'string' },
              year: { type: 'number' },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              created_date: { type: 'string' }
            },
          }
        }
      },
    },
    async (req, res) => {
      const event = await getEventByFancyId(req.params.fancyid);
      if (!event) {
        return new createError.NotFound('Invalid Event');
      }
      return event;
    }
  );

  async function validate_file(req: any) {
    const image = {...req.body.image};
    req.body.image = '@image';
    req.body[Symbol.for('image')] = image;
  }

  fastify.post(
    '/events',
    {
      preValidation: [fastify.authenticate, validate_file],
      schema: {
        description: 'Endpoint to create new events',
        tags: ['Events', ],
        body: {
          type: 'object',
          required: [
            'name',
            'description',
            'city',
            'country',
            'start_date',
            'end_date',
            'year',
            'event_url',
            'image'
          ],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            year: { type: 'integer' },
            event_url: { type: 'string' },
            image: { type: 'string', format: 'binary' },
          },
        },
        response: {
          200: { 
            type: 'object',
            properties: {
              id: { type: 'number' },
              fancy_id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              year: { type: 'number' },
              event_url: { type: 'string' },
              image: { type: 'string' },
              event_host_id: { type: 'number' },
            },
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req:any, res) => {
      const parsed_fancy_id = req.body.name.trim().replace(/\s+/g, '-').toLowerCase() + '-' + req.body.year;

      const user_id = req.user.sub;
      const eventHost = await getEventHost(user_id);
      if (!eventHost) {
        return new createError.NotFound('You are not registered as an event host');
      }

      const image = req.body[Symbol.for('image')][0];
      if (!image) {
        return new createError.BadRequest('You have to send an image');
      }

      if(image.mimetype != 'image/png'){
        return new createError.BadRequest('Image mimetype must be image/png');
      }

      const exists_event = await getEventByFancyId(parsed_fancy_id);
      if (exists_event) {
        return new createError.BadRequest('Event with this fancy id already exists');
      }

      const filename = parsed_fancy_id + '-' + eventHost.id + '-logo.png'
      const google_image_url = await uploadFile(filename, image.mimetype, image.data);
      if (!google_image_url) {
        return new createError.InternalServerError('Error uploading image');
      }

      let newEvent: Omit<PoapEvent, 'id'> = {
        fancy_id: parsed_fancy_id,
        name: req.body.name,
        description: req.body.description,
        city: req.body.city,
        country: req.body.country,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        year: req.body.year,
        event_url: req.body.event_url,
        image: google_image_url,
        event_host_id: eventHost.id
      }

      const event = await createEvent(newEvent);
      if (event == null) {
        return new createError.BadRequest('Invalid event');
      }
      return event;
    }
  );

  fastify.put(
    '/events/:fancyid',
    {
      preValidation: [fastify.authenticate, validate_file],
      schema: {
        description: 'Endpoint to modify several atributes of selected event',
        tags: ['Events', ],
        params: {
          fancyid: { type: 'string' },
        },
        body: {
          type: 'object',
          required: ['event_url', ],
          properties: {
            event_url: { type: 'string' },
            image: { type: 'string', format: 'binary' }
          },
        },
        response: {
          204: { type: 'string'},
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req: any, res) => {
      const user_id = req.user.sub;
      const eventHost = await getEventHost(user_id);
      if (!eventHost) {
        return new createError.NotFound('You are not registered as an event host');
      }

      const image = req.body[Symbol.for('image')][0];
      if (image) {
        if(image.mimetype != 'image/png'){
          return new createError.BadRequest('Image mimetype must be image/png');
        }
      }

      const isOk = await updateEvent(req.params.fancyid, eventHost.id, {
        event_url: req.body.event_url,
        image: '',
      });
      if (!isOk) {
        return new createError.NotFound('Invalid event');
      }
      res.status(204);
      return;
    }
  );

  //********************************************************************
  // TRANSACTIONS
  //********************************************************************

  fastify.get(
    '/transactions',
    {
      preValidation: [fastify.authenticate,], // fastify.isAdmin
      schema: {
        description: 'Paginates endpoint of transactions, you can filter by status',
        tags: ['Transactions', ],
        querystring: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          status: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              offset: { type: 'number' },
              total: { type: 'number' },
              transactions: { 
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number'},
                    tx_hash: { type: 'string'},
                    nonce: { type: 'number'},
                    signer: { type: 'string'},
                    operation: { type: 'string'},
                    arguments: { type: 'string'},
                    status: { type: 'string'},
                    gas_price: { type: 'string'},
                    created_date: { type: 'string'}
                  }
                }
              },
            }
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      let status = req.query.status || null;
      if (status) {
        status = status.split(',');
      } else {
        status = [TransactionStatus.failed, TransactionStatus.passed, TransactionStatus.pending];
      }

      const transactions = await getTransactions(limit, offset, status);
      const totalTransactions = await getTotalTransactions(status);

      if (!transactions) {
        return new createError.NotFound('Transactions not found');
      }
      console.log(transactions);

      return {
        limit: limit,
        offset: offset,
        total: totalTransactions,
        transactions: transactions,
      };
    }
  );

  //********************************************************************
  // SIGNERS
  //********************************************************************

  fastify.get(
    '/signers', {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'List of all the available signers',
        tags: ['Signers', ],
        response: {
          200: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                signer: { type: 'string' },
                role: { type: 'string' },
                gas_price: { type: 'string' },
                created_date: { type: 'string' },
                pending_tx: { type: 'string' },
                balance: { type: 'string' }
              },
            }
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      }
    },
    async (req, res) => {
      let signers = await getSigners();

      if (!signers) {
        return new createError.NotFound('Signers not found');
      }
      signers = await Promise.all(signers.map(signer => getPendingTxsAmount(signer)));
      signers = await Promise.all(signers.map(signer => getAddressBalance(signer)));

      return signers
    });

  fastify.put(
    '/signers/:id',
    {
      preValidation: [fastify.authenticate, fastify.isAdmin],
      schema: {
        description: 'In this endpoint you can modify the signer gas_price',
        tags: ['Signers', ],
        params: {
          id: { type: 'string' },
        },
        body: {
          type: 'object',
          properties: {
            'gas_price': { type: 'string' },
          },
          required: ['gas_price'],
        },
        response: {
          200: { type: 'string'},
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      const isOk = await updateSignerGasPrice(req.params.id, req.body.gas_price);
      if (!isOk) {
        return new createError.NotFound('Invalid signer');
      }
      res.status(204);
      return;
    }
  );

  fastify.get(
    '/token/:tokenId/image',
    {
      schema: {
        description: 'Response an image url of the tokenId you send',
        tags: ['Token', ],
        params: {
          tokenId: { type: 'integer' },
        },
        response: {
          200: { type: 'string'},
        }
      },
    },
    async (req, res) => {
      const tokenId = req.params.tokenId;
      if (!tokenId) {
        return new createError.NotFound('token_id is required');
      }

      const TokenImg = await getTokenImg(tokenId);
      if (!TokenImg) {
        return new createError.NotFound('error getting TokenImg');
      }

      res.redirect(TokenImg)
      return;
    }
  );

  //********************************************************************
  // TASKS
  //********************************************************************

  fastify.post(
    '/tasks',
    {
      schema: {
        description: 'Create a task that mints a POAP nft in the background',
        tags: ['Tasks', ],
        headers: {
          required: ['Authorization'],
          type: 'object',
          properties: {
            'Authorization': { type: 'string' },
          }
        },
        body: {
          type: 'object'
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id:  { type: 'number' },
              name:  { type: 'string' },
              task_data: {type: 'object',},
              status:  { type: 'string' },
              return_data:  { type: 'string' }
            }
          }
        }
      },
    },
    async (req, res) => {
      const taskCreator = await getTaskCreator(req.headers['authorization']);
      if (!taskCreator) {
        return new createError.NotFound('Invalid or expired token');
      }

      const task = await createTask(req.body, taskCreator.task_name);
      if (!task) {
        return new createError.BadRequest('Couldn\'t create the task');
      }
      return task;
    }
  );

  //********************************************************************
  // NOTIFICATIONS
  //********************************************************************

  fastify.get(
    '/notifications',
    {
      schema: {
        description: 'List paginated notifications, you can filter by type, event_id, and address',
        tags: ['Notifications', ],
        querystring: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          address: { type: 'string' },
          event_id: { type: 'number' },
          type: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              offset: { type: 'number' },
              total: { type: 'number' },
              notifications: { 
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number'},
                    title: { type: 'string'},
                    description: { type: 'string'},
                    type: { type: 'string'},
                    event_id: { type: 'number'},
                    event: {
                      type: 'object',
                      properties: {
                        id: { type: 'number'},
                        fancy_id: { type: 'string'},
                        signer: { type: 'string'},
                        signer_ip: { type: 'string'},
                        name: { type: 'string'},
                        description: { type: 'string'},
                        city: { type: 'string'},
                        country: { type: 'string'},
                        event_url: { type: 'string'},
                        image: { type: 'string'},
                        year: { type: 'number'},
                        start_date: { type: 'string'},
                        end_date: { type: 'string'},
                      }
                    },
                    created_date: { type: 'string'}
                  }
                }
              },
            }
          }
        },

      },
    },
    async (req, res) => {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;
      const type = req.query.type || null;
      const event_id = req.query.event_id || null;
      const address = req.query.address || null;
      let event_ids:number[] = [];

      if(type && [NotificationType.inbox, NotificationType.push].indexOf(type) == -1) {
        return new createError.BadRequest('notification type must be in ["inbox", "push"]');
      }

      if(event_id) {
        const event = await getEvent(event_id);
        if (!event) {
          return new createError.BadRequest('event does not exist');
        }

        event_ids.push(event.id)
      }

      if(address) {
        const parsed_address = await checkAddress(address);
        if (!parsed_address) {
          return new createError.BadRequest('Address is not valid');
        }

        event_ids = await getAllEventIds(address)
      }

      let notifications = await getNotifications(limit, offset, type, event_ids);
      const totalNotifications = await getTotalNotifications(type, event_ids);

      const allEvents = await getEvents();

      let indexedEvents: { [id: number] : PoapEvent; } = {}
      for (let event of allEvents) {
        indexedEvents[event.id] = event;
      }

      notifications = notifications.map((notification: Notification) => {
        return {...notification, event:indexedEvents[notification.event_id]};
      });

      return {
        limit: limit,
        offset: offset,
        total: totalNotifications,
        notifications: notifications,
      };
    }
  );

  fastify.post(
    '/notifications',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Create notification and send push notification',
        tags: ['Notifications', ],
        body: {
          type: 'object',
          required: ['title', 'description', 'type', 'event_id'],
          properties: {
            title: {type: 'string'},
            description: {type: 'string'},
            type: {type: 'string'},
            event_id: {type: 'number'}
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number'},
              title: { type: 'string'},
              description: { type: 'string'},
              type: { type: 'string'},
              event_id: { type: 'number'},
              event: {
                type: 'object',
                properties: {
                  id: { type: 'number'},
                  fancy_id: { type: 'string'},
                  signer: { type: 'string'},
                  signer_ip: { type: 'string'},
                  name: { type: 'string'},
                  description: { type: 'string'},
                  city: { type: 'string'},
                  country: { type: 'string'},
                  event_url: { type: 'string'},
                  image: { type: 'string'},
                  year: { type: 'number'},
                  start_date: { type: 'string'},
                  end_date: { type: 'string'},
                }
              },
              created_date: { type: 'string'}
            }
          }
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req, res) => {
      const event_id = req.body.event_id || null;

      if([NotificationType.inbox, NotificationType.push].indexOf(req.body.type) == -1) {
        return new createError.BadRequest('notification type must be in ["inbox", "push"]');
      }

      const notification = await createNotification(req.body);
      if (!notification) {
        return new createError.BadRequest('Couldn\'t create the task');
      }
      
      let topic = 'all';
      if(event_id) {
        const event = await getEvent(req.body.event_id);
        if (!event) {
          return new createError.BadRequest('event does not exist');
        }
        notification.event = event;
        topic = `event-${event.id}`;
      }

      let message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.description
        }
      }

      // Send a message to devices subscribed to the provided topic.
      admin.messaging().send(message).then((response) => {}).catch((error) => {
        return new createError.InternalServerError('Error sending push notification: ' + error);
      });

      return notification
    }
  );

  fastify.get(
    '/qr-claims',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'List paginated qr codes, you can filter by event_id, qr_roll_id, claimed',
        tags: ['Qr-claims', ],
        querystring: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          event_id: { type: 'number' },
          qr_roll_id: { type: 'number' },
          claimed: { type: 'string' },
        },

      },
    },
    async (req: any, res) => {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;
      const eventId = req.query.event_id || null;
      const qrRollId = req.query.qr_roll_id || null;
      const claimed = req.query.claimed || null;
      
      const user_id = req.user.sub;
      const eventHost = await getEventHost(user_id);
      if (!eventHost) {
        return new createError.NotFound('You are not registered as an event host');
      }

      const eventHostQrRolls = await getEventHostQrRolls(eventHost.id);
      if (!eventHostQrRolls || eventHostQrRolls && !eventHostQrRolls[0]) {
        return new createError.NotFound('You dont have any QrRoll asigned');
      }

      if(eventId) {
        const event = await getEvent(eventId);
        if (!event) {
          return new createError.BadRequest('event does not exist');
        }
      }

      if(qrRollId) {
        const qrRoll = await getQrRoll(qrRollId);
        if (!qrRoll) {
          return new createError.BadRequest('Qr Roll does not exist');
        }
      }

      let qrClaims = await getPaginatedQrClaims(limit, offset, eventId, qrRollId, claimed);
      const totalQrClaims = await getTotalQrClaims(eventId, qrRollId, claimed) || 0;

      const allEvents = await getEvents();

      let indexedEvents: { [id: number] : PoapEvent; } = {}
      for (let event of allEvents) {
        indexedEvents[event.id] = event;
      }

      qrClaims = qrClaims.map((qrclaim: ClaimQR) => {
        return {...qrclaim, event:indexedEvents[qrclaim.event_id]};
      });

      return {
        limit: limit,
        offset: offset,
        total: totalQrClaims,
        qr_claims: qrClaims,
      };
    }
  );

  fastify.put(
    '/qr-claims',
    {
      preValidation: [fastify.authenticate, ],
      schema: {
        description: 'Endpoint to assign event to several qr from a range of numeric_id',
        tags: ['Qr-claims', ],
        body: {
          type: 'object',
          required: ['numeric_id_min', 'numeric_id_max', 'event_id'],
          properties: {
            numeric_id_min: { type: 'number' },
            numeric_id_max: { type: 'number' },
            event_id: { type: 'number' },
          },
        },
        response: {
          204: { type: 'string'},
        },
        security: [
          {
            "authorization": []
          }
        ]
      },
    },
    async (req: any, res) => {
      const numericIdMin = parseInt(req.body.numeric_id_min);
      const numericIdMax = parseInt(req.body.numeric_id_max);
      const eventId = parseInt(req.body.event_id);

      const user_id = req.user.sub;
      const eventHost = await getEventHost(user_id);
      if (!eventHost) {
        return new createError.NotFound('You are not registered as an event host');
      }

      const eventHostQrRolls = await getEventHostQrRolls(eventHost.id);
      if (!eventHostQrRolls || eventHostQrRolls && !eventHostQrRolls[0]) {
        return new createError.NotFound('You dont have any QrRoll asigned');
      }

      const event = await getEvent(eventId);
      if (!event) {
        return new createError.BadRequest('event does not exist');
      }

      if(event.event_host_id != eventHost.id) {
        return new createError.BadRequest('You cant assign an event that does not belongs to you');
      }

      if (numericIdMin >= numericIdMax) {
        return new createError.BadRequest('numeric_id_min is greater or equal than numeric_id_max');
      }

      if (numericIdMin <= 0 || numericIdMax <= 0) {
        return new createError.BadRequest('numeric_id must be greater than 0');
      }

      const claimedQrs = await getRangeClaimedQr(numericIdMax, numericIdMin);
      if (claimedQrs && claimedQrs[0]) {
        let ids = [];
        for (let claimedQr of claimedQrs) {
          ids.push(claimedQr.qr_hash)
        }
        return new createError.BadRequest('this qr ids are already claimed: [ ' + ids.toString() + ' ]');
      }

      const notOwnedQrs = await getRangeNotOwnedQr(numericIdMax, numericIdMin, eventHostQrRolls);
      if (notOwnedQrs && notOwnedQrs[0]) {
        let ids = [];
        for (let notOwnedQr of notOwnedQrs) {
          ids.push(notOwnedQr.qr_hash)
        }
        return new createError.BadRequest('this qr ids arent in your rols: [ ' + ids.toString() + ' ]');
      }

      await updateEventOnQrRange(numericIdMax, numericIdMin, eventId);

      res.status(204);
      return;
    }
  );


  //********************************************************************
  // SWAGGER
  //********************************************************************

  fastify.ready(err => {
    if (err) throw err
    fastify.swagger()
  })
}
