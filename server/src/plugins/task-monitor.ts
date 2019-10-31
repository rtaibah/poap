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
    updateTasks: () => void;
  }
}

import cron from 'node-cron';

import { getPendingTasks } from '../db';
import { processUnlockTask } from '../services/unlock-protocol';
import { UnlockTask } from '../types';

export default fp(function taskMonitorCron(
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  opts,
  next
) {
  // Create monitor task
  const monitor = async () => {
    console.log("Running task")
    // Get the PENDING tasks
    let pending_tasks = await getPendingTasks();
    for(let task of pending_tasks){
      // Call the corresponding function to process the task
      switch(task.name){
        case 'unlock-protocol':
          // TODO process the task
          processUnlockTask(task as UnlockTask);
      }
    }

  };

  fastify.decorate('updateTasks', async () => {
    // Run the task every minute
    cron.schedule('*/1 * * * *', monitor);
  });
  fastify.updateTasks();

  next();
});