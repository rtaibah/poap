import fp from 'fastify-plugin';
import jwksClient from 'jwks-rsa';
import fastifyJwt from 'fastify-jwt';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';
import getEnv from './envs';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    authenticate: any;
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

      const signingKey = key.publicKey || key.rsaPublicKey!;

      fastify.register(fastifyJwt, {
        secret: signingKey,
        verify: {
          audience: env.auth0Audience,
          issuer: `https://${env.auth0AppName}.auth0.com/`,
          algorithms: ['RS256'],
        },
      });

      fastify.decorate(
        'authenticate',
        async (request: FastifyRequest<IncomingMessage>, reply: FastifyReply<ServerResponse>) => {
          try {
            await request.jwtVerify();
          } catch (err) {
            reply.send(err);
          }
        }
      );

      next();
    });
  }
);
