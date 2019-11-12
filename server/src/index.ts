import fastifyFactory from 'fastify';
import fastifyHelmet from 'fastify-helmet';
import fastifyCors from 'fastify-cors';
import fastifyRateLimit from 'fastify-rate-limit';
import fastifySwagger from 'fastify-swagger';
// @ts-ignore
import fastifyCompress from 'fastify-compress';

import authPlugin from './auth';
import routes from './routes';
import transactionsMonitorCron  from './plugins/tx-monitor';
import taskMonitorCron  from './plugins/task-monitor';
import dotenv from 'dotenv';
import * as admin from "firebase-admin";
import getEnv from './envs';

dotenv.config();

const fastify = fastifyFactory({
  logger: true,
});

fastify.register(fastifyHelmet, {
  hidePoweredBy: true,
});

fastify.register(fastifyRateLimit, {
  max: 1000,
  timeWindow: 60000
});

fastify.register(fastifyCors, {});
fastify.register(fastifyCompress, {});

const env = getEnv()

fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'POAP swagger',
      description: 'POAP REST endpoints documentation',
      version: '1.0.0'
    },
    externalDocs: {
      url: env.swaggerUrl,
      description: 'Find more info here'
    },
    host: env.swaggerHost,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'metadata', description: 'Metadata related end-points' },
      { name: 'actions', description: 'Actions related end-points' },
      { name: 'token', description: 'Token related end-points' },
      { name: 'burn', description: 'Burn related end-points' },
      { name: 'settings', description: 'Settings related end-points' },
      { name: 'events', description: 'Events related end-points' },
      { name: 'transactions', description: 'Transactions related end-points' },
      { name: 'signers', description: 'Signers related end-points' },
      { name: 'tasks', description: 'Tasks related end-points' },
      { name: 'notifications', description: 'Notifications related end-points' },
    ],
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    }
  },
  routePrefix: '/documentation',
  exposeRoute: true,
})

fastify.register(authPlugin);
fastify.register(routes);
fastify.register(transactionsMonitorCron);
fastify.register(taskMonitorCron);

const start = async () => {
  try {
    await fastify.listen(process.env.PORT ? parseInt(process.env.PORT) : 8080, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});