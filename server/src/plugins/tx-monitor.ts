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
import fetch from 'node-fetch';

import { getPendingTxs, updateTransactionStatus } from '../db';
import { TransactionStatus, TxStatusPayload } from '../types';
import getEnv from '../envs/index';

const EXPLORER_API_BASE = 'https://api.blockcypher.com/v1';

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
      if(env.providerStr == 'local' || env.infuraNet == 'ropsten') {

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
      }
 
      else if (env.infuraNet == 'mainnet') {
        const json: TxStatusPayload = await getTxStatus(txHash);
        if (json) {
          if (json.execution_error) {
            await updateTransactionStatus(txHash, TransactionStatus.failed);
          } else if (json.confirmed) {
            await updateTransactionStatus(txHash, TransactionStatus.passed);
          }
        }
        return json;
      } 
      return
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

async function getTxStatus(hash: string): Promise<TxStatusPayload> {
  const url = `${EXPLORER_API_BASE}/eth/main/txs/${encodeURIComponent(hash)}`;
  const res = await fetch(url);
  if (res.ok) {
    return await res.json();
  } else {
    throw new Error(`Error with request statusCode: ${res.status}`);
  }
}
