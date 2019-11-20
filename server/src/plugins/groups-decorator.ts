import fp from 'fastify-plugin';
import { FastifyReply, FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';

export class jwtIncomingMessage extends IncomingMessage {
  user?: {
    'https://poap.xyz/roles': [ string ];
    iss: string;
    sub: string;
    aud: [ string, ];
    iat: Date;
    exp: Date;
    azp: string;
    scope: string;
  }
}

declare module 'fastify' {
  export interface FastifyInstance<HttpServer = Server, HttpRequest = IncomingMessage, HttpResponse = ServerResponse> {
    isAdmin: any;
  }
}

export default fp((fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>, opts, next) => {
    fastify.decorate('isAdmin', 
      async (request: jwtIncomingMessage, reply: FastifyReply<ServerResponse>) => {
        try {
          if(!request.user) {
            reply.send('Invalid user');
          }
          if (request.user && request.user['https://poap.xyz/roles'].indexOf('ADMIN') == -1) {
            reply.send('User is not allowed');
          }
        } catch (err) {
          reply.send(err);
        }
      }
    );
    next();
  }
);
