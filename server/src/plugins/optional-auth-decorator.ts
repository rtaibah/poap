import fp from 'fastify-plugin';
import jwksClient from 'jwks-rsa';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';
import getEnv from '../envs';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    optionalAuthenticate: any;
  }
}

export default fp((fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>, opts, next) => {
    const env = getEnv();

    const client = jwksClient({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${env.auth0AppName}.auth0.com/.well-known/jwks.json`,
    });

    const kid = env.auth0Kid;
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        next(err);
        return;
      }

      fastify.decorate(
        'optionalAuthenticate',
        async (request: FastifyRequest<IncomingMessage>, reply: FastifyReply<ServerResponse>) => {
          try {
            await request.jwtVerify();
          } catch (err) {
            console.log(err);
          }
        }
      );

      next();
    });
  }
);
