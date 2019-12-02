import { format } from 'date-fns';
import pgPromise from 'pg-promise';
import { PoapEvent, PoapSetting, Omit, Signer, Address, Transaction, TransactionStatus, ClaimQR, Task, UnlockTask, TaskCreator, Services, Notification, NotificationType, eventHost, qrRoll } from '../types';
import { ContractTransaction } from 'ethers';

const db = pgPromise()({
  host: process.env.DB_INSTANCE_CONNECTION_NAME || 'localhost',
  user: process.env.DB_USER || 'poap',
  password: process.env.DB_PASSWORD || 'poap',
  database: process.env.DB_DATABASE || 'poap_dev',
});

function replaceDates(event: PoapEvent): PoapEvent {
  event.start_date = format(new Date(event.start_date), 'MM/DD/YYYY');
  event.end_date = format(new Date(event.end_date), 'MM/DD/YYYY');
  return event;
}

export async function getEvents(): Promise<PoapEvent[]> {
  const res = await db.manyOrNone<PoapEvent>('SELECT * FROM events ORDER BY start_date DESC');

  return res.map(replaceDates);
}

export async function getUserEvents(event_host_id: number): Promise<PoapEvent[]> {
  const res = await db.manyOrNone<PoapEvent>('SELECT * FROM events WHERE event_host_id  = $1 ORDER BY start_date DESC', [event_host_id]);

  return res.map(replaceDates);
}

export async function getTransactions(limit: number, offset: number, statusList: string[]): Promise<Transaction[]> {
  let query = "SELECT * FROM server_transactions WHERE status IN (${statusList:csv}) ORDER BY created_date DESC" +
    " LIMIT ${limit} OFFSET ${offset}";
  const res = await db.manyOrNone<Transaction>(query, {statusList, limit, offset});
  return res
}

export async function getTotalTransactions(statusList: string[]): Promise<number> {
  let query = 'SELECT COUNT(*) FROM server_transactions WHERE status IN (${statusList:csv})'
  const res = await db.result(query, {statusList});
  return res.rows[0].count;
}

export async function getSigners(): Promise<Signer[]> {
  const res = await db.manyOrNone<Signer>('SELECT * FROM signers ORDER BY id ASC');
  return res;
}

export async function getPoapSettings(): Promise<PoapSetting[]> {
  const res = await db.manyOrNone<PoapSetting>('SELECT * FROM poap_settings ORDER BY id DESC');
  return res;
}

export async function getPoapSettingByName(name: string): Promise<null | PoapSetting> {
  const res = await db.oneOrNone<PoapSetting>('SELECT * FROM poap_settings WHERE name = $1', [name]);
  return res;
}

export async function updatePoapSettingByName(name:string, type:string, value:string): Promise<boolean> {
  let query = 'update poap_settings set type=${type}, value=${value} where name=${name}';
  let values = {type, value, name};
  const res = await db.result(query, values);
  return res.rowCount === 1;
}

export async function getSigner(address: string): Promise<null | Signer> {
  const res = await db.oneOrNone<Signer>('SELECT * FROM signers WHERE signer ILIKE $1', [address]);
  return res;
}

export async function getAvailableHelperSigners(): Promise<null | Signer[]> {
  const res = await db.manyOrNone  (`
    SELECT s.id, s.signer, SUM(case when st.status = 'pending' then 1 else 0 end) as pending_txs
    FROM signers s LEFT JOIN server_transactions st on s.signer = st.signer
    WHERE s.role != 'administrator'
    GROUP BY s.id, s.signer
    ORDER BY pending_txs, s.id ASC
  `);
  return res;
}

export async function getTransaction(tx_hash: string): Promise<null | Transaction> {
  const res = await db.oneOrNone<Transaction>('SELECT * FROM server_transactions WHERE tx_hash ILIKE $1', [tx_hash]);
  return res
}

export async function getPendingTxs(): Promise<Transaction[]> {
  const res = await db.manyOrNone<Transaction>("SELECT * FROM server_transactions WHERE status = 'pending' ORDER BY id ASC");
  return res;
}

export async function getPendingTxsAmount(signer: Signer): Promise<Signer> {
  const signer_address = signer.signer
  const status = TransactionStatus.pending;
  const res = await db.result('SELECT COUNT(*) FROM server_transactions WHERE status = ${status} AND signer = ${signer_address}', 
  {
    status,
    signer_address
  });
  signer.pending_tx = res.rows[0].count;
  return signer
}

export async function getEvent(id: number): Promise<null | PoapEvent> {
  const res = await db.oneOrNone<PoapEvent>('SELECT * FROM events WHERE id = $1', [id]);
  return res ? replaceDates(res) : res;
}

export async function getEventByFancyId(fancyid: string): Promise<null | PoapEvent> {
  const res = await db.oneOrNone<PoapEvent>('SELECT * FROM events WHERE fancy_id = $1', [fancyid]);
  return res ? replaceDates(res) : res;
}

export async function updateEvent(
  fancyId: string,
  event_host_id: number,
  changes: Pick<PoapEvent, 'event_url' | 'image_url'>
): Promise<boolean> {
  const res = await db.result(
    'update events set event_url=${event_url}, image_url=${image_url} where fancy_id = ${fancy_id} and event_host_id = ${event_host_id}',
    {
      fancy_id: fancyId,
      event_host_id: event_host_id,
      ...changes,
    }
  );
  return res.rowCount === 1;
}

export async function updateSignerGasPrice(
  Id: string,
  GasPrice: string
): Promise<boolean> {
  const res = await db.result(
    'update signers set gas_price=${gas_price} where id = ${id}',
    {
      gas_price: GasPrice,
      id: Id
    }
  );
  return res.rowCount === 1;
}

export async function createEvent(event: Omit<PoapEvent, 'id'>): Promise<PoapEvent> {
  const data = await db.one(
    'INSERT INTO events(${this:name}) VALUES(${this:csv}) RETURNING id',
    // 'INSERT INTO events (${this:names}) VALUES (${this:list}) RETURNING id',
    event
  );

  return {
    ...event,
    id: data.id as number,
  };
}

export async function saveTransaction(hash: string, nonce: number, operation: string, params: string, signer: Address, status: string, gas_price: string ): Promise<boolean>{
  let query = "INSERT INTO server_transactions(tx_hash, nonce, operation, arguments, signer, status, gas_price) VALUES (${hash}, ${nonce}, ${operation}, ${params}, ${signer}, ${status}, ${gas_price})";
  let values = {hash, nonce, operation, params: params.substr(0, 950), signer, status, gas_price};
  try{
    const res = await db.result(query, values);
    return res.rowCount === 1;
  } catch (e) {
    values.params = 'Error while saving transaction';
    const res = await db.result(query, values);
    return res.rowCount === 1;
  }
  return false;
}

export async function updateTransactionStatus(hash: string, status: TransactionStatus) {
  const res = await db.result(
    'update server_transactions set status=${status} where tx_hash = ${hash}',
    {
      status,
      hash,
    }
  );
  return res.rowCount === 1;
}

export async function getQrClaim(qrHash: string): Promise<null | ClaimQR> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash=${qrHash} AND is_active = true', {qrHash});
  return res;
}

export async function checkDualQrClaim(eventId: number, address: string): Promise<boolean> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE event_id = ${eventId} AND beneficiary = ${address} AND is_active = true', {
    eventId,
    address
  });
  return res === null;
}

export async function adQrClaim(qrHash: string): Promise<null | ClaimQR> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash = $1 AND is_active = true', [qrHash]);
  return res;
}

export async function claimQrClaim(qrHash: string) {
  const res = await db.result('update qr_claims set claimed=true, claimed_date=current_timestamp where qr_hash = $1', [qrHash]);
  return res.rowCount === 1;
}

export async function unclaimQrClaim(qrHash: string) {
  const res = await db.result('update qr_claims set claimed=false, claimed_date=null where qr_hash = $1', [qrHash]);
  return res.rowCount === 1;
}

export async function updateQrClaim(qrHash: string, beneficiary:string, tx: ContractTransaction) {
  const tx_hash = tx.hash
  const signer = tx.from

  const res = await db.result('update qr_claims set tx_hash=${tx_hash}, beneficiary=${beneficiary}, signer=${signer} where qr_hash = ${qrHash}',
  {
    tx_hash,
    beneficiary,
    signer,
    qrHash
  });
  return res.rowCount === 1;
}

export async function getTaskCreator(apiKey: string): Promise<null | TaskCreator> {
  const res = await db.oneOrNone<TaskCreator>(
    'SELECT * FROM task_creators WHERE api_key=${apiKey} AND valid_from <= current_timestamp AND valid_to >= current_timestamp',
    {apiKey}
  );
  return res;
}

export async function createTask(data: any, taskName: string): Promise<null | Task> {
  const task = await db.one(
    'INSERT INTO tasks(name, task_data) VALUES(${taskName}, ${data}) RETURNING id, name, task_data, status, return_data',
    {taskName, data}
  );

  return task;
}

export async function getPendingTasks(): Promise<Task[]>{
  const res = await db.manyOrNone<Task>('SELECT * FROM tasks WHERE status=\'PENDING\'');
  return res;
}

export async function hasToken(unlockTask: UnlockTask): Promise<boolean>{
  const taskId = unlockTask.id;
  const address = unlockTask.task_data.accountAddress;
  const unlockProtocol = Services.unlockProtocol
  const res = await db.result(
    'SELECT * FROM tasks WHERE status<>\'FINISH_WITH_ERROR\' AND id < ${taskId} AND name=${unlockProtocol} AND task_data ->> \'accountAddress\' = ${address}',
    {taskId, address, unlockProtocol})
  return res.rowCount > 0;
}

export async function finishTaskWithErrors(errors: string, taskId: number){
  await db.result(
    'UPDATE tasks SET status=\'FINISH_WITH_ERROR\', return_data=${errors} where id=${taskId}',
    {errors, taskId}
  );
}

export async function setInProcessTask(taskId: number){
  await db.result(
    'UPDATE tasks SET status=\'IN_PROCESS\' where id=${taskId}',
    {taskId}
  );
}

export async function setPendingTask(taskId: number){
  await db.result(
    'UPDATE tasks SET status=\'PENDING\' where id=${taskId}',
    {taskId}
  );
}

export async function finishTask(txHash: string | undefined, taskId: number){
  await db.result(
    'UPDATE tasks SET status=\'FINISH\', return_data=${txHash} where id=${taskId}',
    {txHash, taskId}
  );
}

export async function getNotifications(limit: number, offset: number, typeList: string[]|null, eventIds:number[]): Promise<Notification[]> {
  if(!typeList) {
    typeList = [NotificationType.inbox, NotificationType.push]
  }

  let query = "SELECT * FROM notifications WHERE type IN (${typeList:csv})"

  if(eventIds.length > 0) {
    query = query + "AND event_id IN (${eventIds:csv}) "
  }

  query = query + "ORDER BY created_date DESC LIMIT ${limit} OFFSET ${offset}";

  const res = await db.manyOrNone(query, {limit, offset, typeList, eventIds});
  return res
}

export async function getTotalNotifications(typeList: string[]|null, eventIds:number[]): Promise<number> {
  if(!typeList) {
    typeList = [NotificationType.inbox, NotificationType.push]
  }

  let query = "SELECT COUNT(*) FROM notifications WHERE type IN (${typeList:csv}) "

  if(eventIds.length > 0) {
    query = query + "AND event_id IN (${eventIds:csv}) "
  }

  const res = await db.result(query, {typeList, eventIds});
  return res.rows[0].count;
}

export async function createNotification(data: any): Promise<null | Notification> {
  const notification = await db.one(
    'INSERT INTO notifications(title, description, type, event_id) VALUES(${title}, ${description}, ${type}, ${event_id}) RETURNING id, title, description, type, event_id, created_date',
    {...data}
  );

  return notification;
}

export async function getEventHost(userId: string): Promise<null | eventHost> {
  const res = await db.oneOrNone<eventHost>('SELECT * FROM event_host WHERE user_id=${userId} AND is_active = true', {userId});
  return res;
}

export async function getRangeClaimedQr(numericIdMax: number, numericIdMin: number): Promise<null | ClaimQR[]> {
  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE numeric_id<=${numericIdMax} AND numeric_id>=${numericIdMin} AND is_active = true AND claimed = true', {
    numericIdMax,
    numericIdMin
  });

  return res;
}

export async function getClaimedQrsList(qrCodeIds: number[]): Promise<null | ClaimQR[]> {
  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE id IN (${qrCodeIds:csv}) AND is_active = true AND claimed = true', {
    qrCodeIds
  });

  return res;
}

export async function getRangeNotOwnedQr(numericIdMax: number, numericIdMin: number, eventHostQrRolls: qrRoll[]): Promise<null | ClaimQR[]> {
  let qrRollIds = [];
  for (let qrRoll of eventHostQrRolls) {
    qrRollIds.push(qrRoll.id)
  }

  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_roll_id NOT IN (${qrRollIds:csv}) AND numeric_id<=${numericIdMax} AND numeric_id>=${numericIdMin} AND is_active = true', {
    numericIdMax,
    numericIdMin,
    qrRollIds
  });

  return res;
}

export async function getNotOwnedQrList(numericIdMax: number[], eventHostQrRolls: qrRoll[]): Promise<null | ClaimQR[]> {
  let qrRollIds = [];
  for (let qrRoll of eventHostQrRolls) {
    qrRollIds.push(qrRoll.id)
  }

  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_roll_id NOT IN (${qrRollIds:csv}) AND id IN (${numericIdMax:csv}) AND is_active = true', {
    numericIdMax,
    qrRollIds
  });

  return res;
}

export async function updateEventOnQrRange(numericIdMax: number, numericIdMin: number, eventId: number){
  await db.result('UPDATE qr_claims SET event_id=${eventId} where numeric_id<=${numericIdMax} AND numeric_id>=${numericIdMin}', {
    numericIdMax,
    numericIdMin,
    eventId
  });
}

export async function updateQrClaims(qrCodeIds:number[], eventId: number){
  await db.result('UPDATE qr_claims SET event_id=${eventId} where id IN (${qrCodeIds:csv})', {
    qrCodeIds,
    eventId
  });
}

export async function getEventHostQrRolls(eventHostId: number): Promise<null | qrRoll[]> {
  const hostId = eventHostId.toString();
  const res = await db.manyOrNone<qrRoll>('SELECT * FROM qr_roll WHERE event_host_id = ${hostId} AND is_active = true', {
    hostId
  });

  return res;
}

export async function getQrRolls(): Promise<null | qrRoll[]> {
  const res = await db.manyOrNone<qrRoll>('SELECT * FROM qr_roll WHERE is_active = true');
  return res;
}

export async function getQrRoll(qrRollId: string): Promise<null | eventHost> {
  const res = await db.oneOrNone<eventHost>('SELECT * FROM qr_roll WHERE id=${qrRollId} AND is_active = true', {qrRollId});
  return res;
}



export async function getPaginatedQrClaims(limit: number, offset: number, eventId:number, qrRollId:number, claimed:string|null): Promise<ClaimQR[]> {
  let query = 'SELECT * FROM qr_claims WHERE is_active = true '

  if(eventId) {
    query = query + `AND event_id = ${eventId} `
  }

  if(qrRollId) {
    query = query + `AND qr_roll_id = ${qrRollId} `
  }

  if(claimed == 'true') {
    query = query + 'AND claimed = true '
  }

  if(claimed == 'false') {
    query = query + 'AND claimed = false '
  }

  query = query + 'ORDER BY created_date DESC LIMIT ${limit} OFFSET ${offset}';

  const res = await db.manyOrNone<ClaimQR>(query, {limit, offset});
  return res
}

export async function getTotalQrClaims(eventId:number, qrRollId:number, claimed:string|null): Promise<number> {
  let query = 'SELECT * FROM qr_claims WHERE is_active = true '

  if(eventId) {
    query = query + `AND event_id = ${eventId} `
  }

  if(qrRollId) {
    query = query + `AND qr_roll_id = ${qrRollId} `
  }

  if(claimed == 'true') {
    query = query + `AND claimed = true `
  }

  if(claimed == 'false') {
    query = query + `AND claimed = false `
  }

  query = query + 'ORDER BY created_date DESC'

  const res = await db.result(query);
  return res.rowCount;
}
