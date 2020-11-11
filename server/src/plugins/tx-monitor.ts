import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import cron from 'node-cron';

import { getPendingTxs, updateTransactionStatus } from '../db';
import { Layer, TransactionStatus } from '../types';
import getEnv from '../envs/index';
import { TransactionReceipt } from 'ethers/providers';
import { ethers } from 'ethers';
import { getABI } from '../eth/helpers';

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


function getTokenIds(receipt: TransactionReceipt): number[] {
  ethers.errors.setLogLevel('error');
  const abi = new ethers.utils.Interface(getABI('Poap'));
  let tokens: number[] = [];
  if (!receipt || !receipt.logs) {
    return tokens;
  }
  receipt.logs.forEach(log => {
    if(log.topics.length > 3 && log.topics[0] == abi.events.Transfer.topic){
      // Get the last topic for the id
      tokens.push(ethers.utils.bigNumberify(log.topics[3]).toNumber());
    }
  })
  return tokens;
}

export default fp(function transactionsMonitorCron(
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  opts,
  next
) {
  const monitor = async () => {
    const envMap = new Map()
    envMap.set(Layer.layer1, getEnv({layer: Layer.layer1}));
    envMap.set(Layer.layer2, getEnv({layer: Layer.layer2}));

    const pendingTransactions = await getPendingTxs();
    if (!pendingTransactions || pendingTransactions.length === 0) return;

    const txPromises = pendingTransactions.map(async ({ tx_hash: txHash, layer: layer }) => {
      const env = envMap.get(layer);
      const receipt = await env.provider.getTransactionReceipt(txHash);
      const tokens = getTokenIds(receipt);

      let data: any;
      if(tokens.length == 1) {
        data = {token: tokens[0]}
      } else {
        data = {tokens}
      }

      if (receipt) {
        if (receipt.status == 1) {
          updateTransactionStatus(txHash, TransactionStatus.passed, data);
        } else if (receipt.status == 0) {
          updateTransactionStatus(txHash, TransactionStatus.failed);
        }
      }
      return receipt
    });
    const results = Promise.all(txPromises);
    return results;
  };
  fastify.decorate('updateTransactions', async () => {
    cron.schedule('*/2 * * * * *', monitor);
  });
  fastify.updateTransactions();

  next();
});
