import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import cron from 'node-cron';

import { getPendingTasks } from '../db';
import { processUnlockTask } from '../services/unlock-protocol';
import { processMigrationTask } from '../services/migration-service';
import { MigrateTask, Services, UnlockTask } from '../types';

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

export default fp(function taskMonitorCron(
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  opts,
  next
) {
  // Create task monitor
  const monitor = async () => {
    // Get the PENDING tasks
    let pendingTasks = await getPendingTasks();
    for(let task of pendingTasks){
      // Call the corresponding function to process the task
      switch(task.name){
        case Services.unlockProtocol:
          processUnlockTask(task as UnlockTask);
          break;
        case Services.migrationService:
          await processMigrationTask(task as MigrateTask);
          break;
      }
    }

  };

  fastify.decorate('updateTasks', async () => {
    // Run the task every minute
    cron.schedule('*/10 * * * *', monitor);
  });
  fastify.updateTasks();

  next();
});
