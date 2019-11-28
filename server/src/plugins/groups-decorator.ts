import fp from 'fastify-plugin';
import { FastifyReply, FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';
import { UserRole, auth0USer } from '../types';

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

export function getUserRoles(user: auth0USer | any){
  return user['https://poap.xyz/roles']
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
          if (request.user && getUserRoles(request.user).indexOf(UserRole.administrator) == -1) {
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
