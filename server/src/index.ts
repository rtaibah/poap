import fastifyFactory from 'fastify';
import fastifyHelmet from 'fastify-helmet';
import fastifyCors from 'fastify-cors';
import fastifyRateLimit from 'fastify-rate-limit';

// @ts-ignore
import fastifyCompress from 'fastify-compress';

import authPlugin from './auth';
import routes from './routes';
import transactionsMonitorCron  from './plugins/tx-monitor';
import dotenv from 'dotenv'

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

fastify.register(authPlugin);
fastify.register(routes);
fastify.register(transactionsMonitorCron);

const start = async () => {
  try {
    await fastify.listen(process.env.PORT ? parseInt(process.env.PORT) : 8080, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
