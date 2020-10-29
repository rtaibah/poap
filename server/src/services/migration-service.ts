import { Layer, MigrateTask, TokenInfo, TransactionStatus } from '../types';
import { burnToken, getTokenInfo, isBurned } from '../eth/helpers';
import { finishTask, finishTaskWithErrors, getTransaction, updateTaskData } from '../db';
import poapGraph from '../plugins/thegraph-utils';

export async function processMigrationTask(task :MigrateTask){
  let token: TokenInfo | null = null;
  // Check if there is a hash in the task
  if(task.task_data.tx_hash) {
    // Get the transaction
    const tx = await getTransaction(task.task_data.tx_hash);

    // if finished: change the status of the task
    if(tx && tx.status === TransactionStatus.passed) {
      await finishTask(task.task_data.tx_hash, task.id);
    } else if(tx && tx.status === TransactionStatus.failed) {
      // Remove the tx from the task and try again
      task.task_data.tx_hash = undefined;
      await updateTaskData(task.id, task.task_data);
    }
    return;
  }

  // Get the token info
  try{
    // First try with The Graph
    token = await poapGraph.getTokenInfo(task.task_data.tokenId);
  } catch (e) {
    token = await getTokenInfo(task.task_data.tokenId);
  }

  // if the token is burned: mark the task as finished
  if (await isBurned(token.tokenId, Layer.layer2)) {
    await finishTaskWithErrors("Token already burned", task.id);
    return;
  }

  // If the token is not in L1: do nothing
  if(token.layer !== Layer.layer1){
    return
  }

  // Burn the token in L2
  const tx = await burnToken(token.tokenId, false, {layer: Layer.layer2});

  if(!tx || !tx.hash) {
    // Try it another time
    return;
  }

  // Update the task with the tx hash
  task.task_data.tx_hash = tx.hash;
  await updateTaskData(task.id, task.task_data);
}
