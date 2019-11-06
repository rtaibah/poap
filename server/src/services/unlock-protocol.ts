import {UnlockTask, Services} from '../types';
import { getABI, mintToken, checkAddress, checkHasToken } from '../eth/helpers';
import { Contract, getDefaultProvider } from 'ethers';
import { UnlockProtocol } from '../eth/UnlockProtocol';
import { hasToken, finishTaskWithErrors, finishTask } from '../db';

const ABI = getABI('UnlockProtocol');

const eventID = 80;

export async function processUnlockTask(task :UnlockTask){
  if(task.name !== Services.unlockProtocol) return;

  // Check that the accountAddress is a valid address
  if(await checkAddress(task.task_data.accountAddress) == null) {
    finishTaskWithErrors('Invalid account address', task.id);
    return;
  }

  // Check that the lockAddress is a valid address
  if(await checkAddress(task.task_data.lockAddress) == null) {
    finishTaskWithErrors('Invalid lock address', task.id);
    return;
  }

  // Check if the address has a token
  if(await hasToken(task)){
    finishTaskWithErrors("Token already minted or in process", task.id);
    return;
  }

  // Instantiate the unlock contract
  let unlock = new Contract(task.task_data.lockAddress, ABI, getDefaultProvider()) as UnlockProtocol;
  // Check if the address has a valid key 
  const hasValidKey = await unlock.functions.getHasValidKey(task.task_data.accountAddress);

  if(!hasValidKey){
    return;
  }

  const has_token = await checkHasToken(eventID, task.task_data.accountAddress);
  if (has_token) {
    finishTaskWithErrors("Address already has token in blockchain", task.id);
    return;
  }

  // Mint token
  const txHash = await mintToken(eventID, task.task_data.accountAddress, false);

  // Return without changing the status (try it again later)
  if(txHash == null) return;
  
  finishTask(txHash.hash, task.id);
}
