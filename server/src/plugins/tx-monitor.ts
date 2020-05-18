import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { IncomingMessage, ServerResponse, Server } from 'http';

declare module 'fastify' {
  export interface FastifyInstance<
    HttpServer = Server,
    HttpRequest = IncomingMessage,
    HttpResponse = ServerResponse
  > {
    authenticate: any;
    updateTransactions: () => void;
  }
}

import cron from 'node-cron';

import { getPendingTxs, updateTransactionStatus } from '../db';
import { TransactionStatus } from '../types';
import getEnv from '../envs/index';

export default fp(function transactionsMonitorCron(
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  opts,
  next
) {
  const monitor = async () => {
    const env = getEnv();
    const pendingTransactions = await getPendingTxs();
    if (!pendingTransactions || pendingTransactions.length === 0) return;

    const txPromises = pendingTransactions.map(async ({ tx_hash: txHash }) => {
      const receipt = await env.provider.getTransactionReceipt(txHash).then((receipt) => {
        if(receipt) {
          if(receipt.status == 1) {
            updateTransactionStatus(txHash, TransactionStatus.passed);
          } else if (receipt.status == 0) {
            updateTransactionStatus(txHash, TransactionStatus.failed);
          }
        }
        return receipt
      });
      return receipt
    });
    const results = Promise.all(txPromises);
    return results;
  };
  fastify.decorate('updateTransactions', async () => {
    cron.schedule('*/12 * * * * *', monitor);
  });
  fastify.updateTransactions();

  next();
});
