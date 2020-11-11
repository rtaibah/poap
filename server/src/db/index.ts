import { format } from 'date-fns';
import pgPromise from 'pg-promise';
import {
  Address,
  ClaimQR,
  EmailClaim,
  eventHost,
  EventTemplate,
  FullEventTemplate,
  Layer,
  MigrateTask,
  Notification,
  NotificationType,
  Omit,
  PoapEvent,
  PoapFullEvent,
  PoapSetting,
  qrRoll,
  Services,
  Signer,
  Task,
  TaskCreator,
  Transaction,
  TransactionStatus,
  UnlockTask,
} from '../types';
import { ContractTransaction } from 'ethers';

const db = pgPromise()({
  host: process.env.DB_INSTANCE_CONNECTION_NAME || 'localhost',
  user: process.env.DB_USER || 'poap',
  password: process.env.DB_PASSWORD || 'poap',
  database: process.env.DB_DATABASE || 'poap_dev',
});

const publicEventColumns = 'id, fancy_id, name, description, city, country, event_url, image_url, year, start_date, ' +
  'end_date, event_host_id, from_admin, virtual_event, event_template_id';

const publicTemplateColumns = 'id, name, title_image, title_link, header_link_text, header_link_url, header_color, ' +
  'header_link_color, main_color, footer_color, left_image_url, left_image_link, right_image_url, right_image_link, ' +
  'mobile_image_url, mobile_image_link, footer_icon';

export function formatDate(dbDate: string): string {
  return format(new Date(dbDate), 'DD-MMM-YYYY');
}

export async function getEvents(): Promise<PoapEvent[]> {
  const res = await db.manyOrNone<PoapEvent>('SELECT ' + publicEventColumns + ' FROM events ORDER BY start_date DESC');
  return res.map(event => {
    return {
      ...event,
      start_date: formatDate(event.start_date),
      end_date: formatDate(event.end_date),
    }
  });
}

export async function getTransactions(limit: number, offset: number, statusList: string[], signer: string | null): Promise<Transaction[]> {
  let signerCondition = '';
  let order = ' ORDER BY created_date DESC ';
  if (signer) {
    signerCondition = ' AND signer ILIKE ${signer}';
    order = ' ORDER BY nonce DESC, status DESC, gas_price ASC ';
  }
  let query = "SELECT * FROM server_transactions WHERE status IN (${statusList:csv}) " +
    signerCondition + order +
    " LIMIT ${limit} OFFSET ${offset}";
  const res = await db.manyOrNone<Transaction>(query, { statusList, limit, offset, signer });
  return res
}

export async function getTotalTransactions(statusList: string[], signer: string | null): Promise<number> {
  let signerCondition = '';
  if (signer) { signerCondition = ' AND signer ILIKE ${signer}'; }

  let query = 'SELECT COUNT(*) FROM server_transactions WHERE status IN (${statusList:csv}) ' + signerCondition;
  const res = await db.result(query, { statusList, signer });
  return res.rows[0].count;
}

export async function getSigners(layer: Layer = Layer.layer1): Promise<Signer[]> {
  const res = await db.manyOrNone<Signer>(
    'SELECT * FROM signers WHERE layer = ${layer} ORDER BY id ASC',
    { layer }
  );
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

export async function updatePoapSettingByName(name: string, type: string, value: string): Promise<boolean> {
  let query = 'update poap_settings set type=${type}, value=${value} where name=${name}';
  let values = { type, value, name };
  const res = await db.result(query, values);
  return res.rowCount === 1;
}

export async function getSigner(address: string, layer: Layer = Layer.layer1): Promise<null | Signer> {
  const res = await db.oneOrNone<Signer>('SELECT * FROM signers WHERE signer ILIKE $1 AND layer = $2', [address, layer]);
  return res;
}

export async function getAvailableHelperSigners(layer: Layer = Layer.layer1): Promise<null | Signer[]> {
  const res = await db.manyOrNone(`
    SELECT s.id, s.signer, SUM(case when st.status = 'pending' then 1 else 0 end) as pending_tx
    FROM signers s LEFT JOIN server_transactions st on LOWER(s.signer) = LOWER(st.signer)
    WHERE s.role != 'administrator' AND s.layer = $1
    GROUP BY s.id, s.signer
    ORDER BY pending_tx, s.id ASC
  `, [layer]);
  return res;
}

export async function getLastSignerTransaction(signer: string, layer: Layer = Layer.layer1): Promise<null | Transaction> {
  const res = await db.oneOrNone<Transaction>(`
  SELECT * FROM server_transactions
  WHERE signer ILIKE $1 AND layer = $2 ORDER BY nonce DESC LIMIT 1`, [signer, layer]);
  return res
}

export async function getTransaction(tx_hash: string): Promise<null | Transaction> {
  const res = await db.oneOrNone<Transaction>('SELECT * FROM server_transactions WHERE tx_hash ILIKE $1', [tx_hash]);
  return res
}

export async function getPendingTxs(): Promise<Transaction[]> {
  const res = await db.manyOrNone<Transaction>("SELECT * FROM server_transactions WHERE status = 'pending' ORDER BY id ASC");
  return res;
}

export async function getPendingTxsAmount(signer: Signer, layer: Layer = Layer.layer1): Promise<Signer> {
  const signer_address = signer.signer
  const status = TransactionStatus.pending;
  const res = await db.result(
    'SELECT COUNT(*) FROM server_transactions WHERE status = ${status} AND layer = ${layer} AND signer ILIKE ${signer_address}',
    {
      status,
      layer,
      signer_address
    });
  signer.pending_tx = res.rows[0].count;
  return signer
}

export async function getEvent(id: number | string): Promise<null | PoapEvent> {
  const res = await db.oneOrNone<PoapEvent>('SELECT ' + publicEventColumns + ' FROM events WHERE id = ${id}', { id: id });
  if(res) {
    return {
      ...res,
      start_date: formatDate(res.start_date),
      end_date: formatDate(res.end_date)
    }
  }
  return res;
}

export async function getEventByFancyId(fancyId: string): Promise<null | PoapEvent> {
  let query = 'SELECT ' + publicEventColumns + ' FROM events WHERE fancy_id = ${fancyId}'
  const res = await db.oneOrNone<PoapEvent>(query, {fancyId});
  if(res) {
    return {
      ...res,
      start_date: formatDate(res.start_date),
      end_date: formatDate(res.end_date),
    }
  }
  return res;
}

export async function getFullEventByFancyId(fancyId: string): Promise<null | PoapFullEvent> {
  let query = 'SELECT * FROM events WHERE fancy_id = ${fancyId}'
  const res = await db.oneOrNone<PoapFullEvent>(query, {fancyId});
  if(res) {
    return {
      ...res,
      start_date: formatDate(res.start_date),
      end_date: formatDate(res.end_date),
    }
  }
  return res;
}

export async function updateEvent(
  fancyId: string,
  changes: Pick<PoapFullEvent, 'event_url' | 'image_url' | 'name' | 'description' | 'city' | 'country' | 'start_date' | 'end_date' | 'virtual_event' | 'secret_code' | 'event_template_id'>
): Promise<boolean> {
  const res = await db.result(
    'UPDATE EVENTS SET ' +
    'name=${name}, ' +
    'description=${description}, ' +
    'city=${city}, ' +
    'country=${country}, ' +
    'start_date=${start_date}, ' +
    'end_date=${end_date}, ' +
    'event_url=${event_url}, ' +
    'image_url=${image_url}, ' +
    'virtual_event=${virtual_event}, ' +
    'secret_code=${secret_code}, ' +
    'event_template_id=${event_template_id} ' +
    'WHERE fancy_id = ${fancyId}',
    {
      fancyId,
      ...changes,
    }
  );
  return res.rowCount === 1;
}

export async function saveEventUpdate(eventId: number, field: string, newValue: string, oldValue: string, isAdmin: boolean): Promise<boolean> {
  let query = 'INSERT INTO events_history (event_id, field, old_value, new_value, from_admin) ' +
    'VALUES (${eventId}, ${field}, ${oldValue}, ${newValue}, ${isAdmin}) RETURNING id'

  await db.one(query, {eventId, field, oldValue, newValue, isAdmin})
  return true
}

export async function updateSignerGasPrice(
  Id: string,
  GasPrice: string
): Promise<boolean> {
  const res = await db.result(
    'update signers set gas_price=${gas_price} where id = ${id}',
    {
      gas_price: parseInt(GasPrice),
      id: Id
    }
  );
  return res.rowCount === 1;
}

export async function createEvent(event: Omit<PoapFullEvent, 'id'>): Promise<PoapFullEvent> {
  const data = await db.one(
    'INSERT INTO events(${this:name}) VALUES(${this:csv}) RETURNING id',
    event
  );

  return {
    ...event,
    id: data.id as number,
  };
}

export async function saveTransaction(hash: string, nonce: number, operation: string, params: string, signer: Address, status: string, gas_price: string, layer: Layer = Layer.layer1): Promise<boolean> {
  let query = "INSERT INTO server_transactions(tx_hash, nonce, operation, arguments, signer, status, gas_price, layer) VALUES (${hash}, ${nonce}, ${operation}, ${params}, ${signer}, ${status}, ${gas_price}, ${layer})";
  let values = { hash, nonce, operation, params: params.substr(0, 1950), signer, status, gas_price, layer };
  try {
    const res = await db.result(query, values);
    return res.rowCount === 1;
  } catch (e) {
    values.params = 'Error while saving transaction';
    const res = await db.result(query, values);
    return res.rowCount === 1;
  }
  return false;
}

export async function updateTransactionStatus(hash: string, status: TransactionStatus, result?: any) {
  const res = await db.result(
    'update server_transactions set status=${status}, result=${result} where tx_hash = ${hash}',
    {
      status,
      result,
      hash,
    }
  );
  return res.rowCount === 1;
}

export async function getQrClaim(qrHash: string): Promise<null | ClaimQR> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash=${qrHash} AND is_active = true', { qrHash });
  return res;
}

export async function updateQrScanned(qrHash: string) {
  const res = await db.result('UPDATE qr_claims SET scanned = true WHERE qr_hash=${qrHash} AND is_active = true', { qrHash });
  return res.rowCount === 1;
}

export async function checkDualQrClaim(eventId: number, address: string): Promise<boolean> {
  let query = 'SELECT COUNT(*) FROM qr_claims WHERE event_id = ${eventId} AND beneficiary = ${address} AND is_active = true';
  const res = await db.result(query, {eventId, address});
  let count = res.rows[0].count;
  return count === '0';
}

export async function checkDualEmailQrClaim(eventId: number, email: string): Promise<boolean> {
  let query = 'SELECT COUNT(*) FROM qr_claims WHERE event_id = ${eventId} AND user_input = ${email} AND is_active = true';
  const res = await db.result(query, {eventId, email});
  let count = res.rows[0].count;
  return count === '0';
}

export async function checkQrHashExists(qrHash: string): Promise<boolean> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash = ${qrHash}', {
    qrHash,
  });
  return res != null;
}

export async function checkNumericIdExists(numericId: number): Promise<boolean> {
  const res = await db.oneOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE numeric_id = ${numericId}', {
    numericId,
  });
  return res != null;
}

export async function claimQrClaim(qrHash: string) {
  const res = await db.result('update qr_claims set claimed=true, claimed_date=current_timestamp where qr_hash = $1', [qrHash]);
  return res.rowCount === 1;
}

export async function unclaimQrClaim(qrHash: string) {
  const res = await db.result('update qr_claims set claimed=false, claimed_date=null where qr_hash = $1', [qrHash]);
  return res.rowCount === 1;
}

export async function updateQrClaim(qrHash: string, beneficiary: string, user_input: string, tx: ContractTransaction) {
  const tx_hash = tx.hash
  const signer = tx.from

  const res = await db.result('UPDATE qr_claims SET tx_hash=${tx_hash}, beneficiary=${beneficiary}, signer=${signer}, user_input=${user_input} WHERE qr_hash = ${qrHash}',
    {
      tx_hash,
      beneficiary,
      user_input,
      signer,
      qrHash
    });
  return res.rowCount === 1;
}

export async function updateEmailQrClaims(user_input: string, beneficiary: string, tx: ContractTransaction) {
  const tx_hash = tx.hash
  const signer = tx.from

  const res = await db.result('UPDATE qr_claims SET tx_hash=${tx_hash}, beneficiary=${beneficiary}, signer=${signer} WHERE user_input=${user_input} AND tx_hash IS NULL',
    {
      tx_hash,
      signer,
      beneficiary,
      user_input,
    });
  return res.rowCount === 1;
}

export async function updateQrInput(qrHash: string, user_input: string) {

  const res = await db.result('UPDATE qr_claims SET user_input=${user_input} WHERE qr_hash = ${qrHash}',
    {
      user_input,
      qrHash
    });
  return res.rowCount === 1;
}

export async function updateDelegatedQrClaim(qrHash: string, beneficiary: string, user_input: string, message: string) {
  const res = await db.result('UPDATE qr_claims SET delegated_mint=TRUE, delegated_signed_message=${message}, beneficiary=${beneficiary}, user_input=${user_input} WHERE qr_hash = ${qrHash}',
    {
      beneficiary,
      user_input,
      message,
      qrHash
    });
  return res.rowCount === 1;
}

export async function updateBumpedQrClaim(eventId: number, beneficiary: string, signer: string, hash: string, new_hash: string) {
  const query = 'UPDATE qr_claims SET tx_hash=${new_hash} ' +
    'WHERE beneficiary ILIKE ${beneficiary} AND event_id = ${eventId} AND signer ILIKE ${signer} AND tx_hash ILIKE ${hash}';
  await db.result(query, { new_hash, beneficiary,  eventId, signer, hash });
}

export async function getTaskCreator(apiKey: string): Promise<null | TaskCreator> {
  const res = await db.oneOrNone<TaskCreator>(
    'SELECT * FROM task_creators WHERE api_key=${apiKey} AND valid_from <= current_timestamp AND valid_to >= current_timestamp',
    { apiKey }
  );
  return res;
}

export async function createTask(taskName: string, data: any): Promise<null | Task> {
  const task = await db.one(
    'INSERT INTO tasks(name, task_data) VALUES(${taskName}, ${data}) RETURNING id, name, task_data, status, return_data',
    { taskName, data }
  );

  return task;
}

export async function getPendingTasks(): Promise<Task[]> {
  const res = await db.manyOrNone<Task>('SELECT * FROM tasks WHERE status=\'PENDING\'');
  return res;
}

export async function hasToken(unlockTask: UnlockTask): Promise<boolean> {
  const taskId = unlockTask.id;
  const address = unlockTask.task_data.accountAddress;
  const unlockProtocol = Services.unlockProtocol
  const res = await db.result(
    'SELECT * FROM tasks WHERE status<>\'FINISH_WITH_ERROR\' AND id < ${taskId} AND name=${unlockProtocol} AND task_data ->> \'accountAddress\' = ${address}',
    { taskId, address, unlockProtocol })
  return res.rowCount > 0;
}

export async function getMigrationTask(tokenId: number | string): Promise<null | MigrateTask> {
  return db.oneOrNone(
    'SELECT * FROM tasks WHERE status<>\'FINISH_WITH_ERROR\' AND name=${migrationService} AND task_data ->> \'tokenId\' = ${tokenId}',
    { tokenId, migrationService: Services.migrationService });
}

export async function updateTaskData(taskId: number, task_data: any) {
  await db.result(
    'UPDATE tasks SET task_data = ${task_data} WHERE name=${migrationService} AND id=${taskId}',
    { taskId, migrationService: Services.migrationService, task_data });
}

export async function finishTaskWithErrors(errors: string, taskId: number) {
  await db.result(
    'UPDATE tasks SET status=\'FINISH_WITH_ERROR\', return_data=${errors} where id=${taskId}',
    { errors, taskId }
  );
}

export async function setInProcessTask(taskId: number) {
  await db.result(
    'UPDATE tasks SET status=\'IN_PROCESS\' where id=${taskId}',
    { taskId }
  );
}

export async function setPendingTask(taskId: number) {
  await db.result(
    'UPDATE tasks SET status=\'PENDING\' where id=${taskId}',
    { taskId }
  );
}

export async function finishTask(txHash: string | undefined, taskId: number) {
  await db.result(
    'UPDATE tasks SET status=\'FINISH\', return_data=${txHash} where id=${taskId}',
    { txHash, taskId }
  );
}

export async function getNotifications(limit: number, offset: number, typeList: string[] | null, eventIds: number[] | null, addressFilter: boolean): Promise<Notification[]> {
  if (!typeList) {
    typeList = [NotificationType.inbox, NotificationType.push]
  }

  let condition = '';

  if (eventIds === null) {
    condition = "AND event_id IS NULL "
  } else if (eventIds.length > 0) {
    condition = "AND event_id IN (${eventIds:csv}) "
  }

  if (addressFilter) {
    condition = "AND ( event_id IN (${eventIds:csv}) OR event_id IS NULL ) "
  }

  let query = "SELECT * FROM notifications WHERE type IN (${typeList:csv}) " + condition +
    " ORDER BY created_date DESC LIMIT ${limit} OFFSET ${offset}";

  const res = await db.manyOrNone(query, { limit, offset, typeList, eventIds });
  return res
}

export async function getTotalNotifications(typeList: string[] | null, eventIds: number[] | null, addressFilter: boolean): Promise<number> {
  if (!typeList) {
    typeList = [NotificationType.inbox, NotificationType.push]
  }

  let condition = '';
  if (eventIds === null) {
    condition = "AND event_id IS NULL "
  } else if (eventIds.length > 0) {
    condition = "AND event_id IN (${eventIds:csv}) "
  }

  if (addressFilter) {
    condition = "AND ( event_id IN (${eventIds:csv}) OR event_id IS NULL ) "
  }

  let query = "SELECT COUNT(*) FROM notifications WHERE type IN (${typeList:csv}) " + condition

  const res = await db.result(query, { typeList, eventIds });
  return res.rows[0].count;
}

export async function createNotification(data: any): Promise<null | Notification> {
  const notification = await db.one(
    'INSERT INTO notifications(title, description, type, event_id) VALUES(${title}, ${description}, ${type}, ${event_id}) RETURNING id, title, description, type, event_id, created_date',
    { ...data }
  );

  return notification;
}

export async function getEventHost(userId: string): Promise<null | eventHost> {
  const res = await db.oneOrNone<eventHost>('SELECT * FROM event_host WHERE user_id=${userId} AND is_active = true', { userId });
  return res;
}

export async function getEventHostByPassphrase(passphrase: string): Promise<null | eventHost> {
  const res = await db.oneOrNone<eventHost>('SELECT * FROM event_host WHERE passphrase=${passphrase} AND is_active = true', { passphrase });
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

export async function getClaimedQrsHashList(qrHashIds: string[]): Promise<null | ClaimQR[]> {
  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE qr_hash IN (${qrHashIds:csv}) AND is_active = true AND claimed = true', {
    qrHashIds
  });

  return res;
}

export async function createQrClaims(hashesToAdd: any[]) {
  // https://stackoverflow.com/questions/36233566/inserting-multiple-records-with-pg-promise

  const res = await db.tx(t => {
    const queries = hashesToAdd.map(qr_claim => {
      return t.one('INSERT INTO qr_claims(qr_hash, numeric_id, event_id, delegated_mint) VALUES(${qr_hash}, ${numeric_id}, ${event_id}, ${delegated_mint}) RETURNING id', qr_claim, a => +a.id);
    });
    return t.batch(queries);
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

export async function updateEventOnQrRange(numericIdMax: number, numericIdMin: number, eventId: number) {
  await db.result('UPDATE qr_claims SET event_id=${eventId} where numeric_id<=${numericIdMax} AND numeric_id>=${numericIdMin}', {
    numericIdMax,
    numericIdMin,
    eventId
  });
}

export async function updateQrClaims(qrCodeIds: number[], eventId: number) {
  await db.result('UPDATE qr_claims SET event_id=${eventId} where id IN (${qrCodeIds:csv})', {
    qrCodeIds,
    eventId
  });
}

export async function updateQrClaimsHashes(qrCodeHashes: string[], eventId: number) {
  await db.result('UPDATE qr_claims SET event_id=${eventId} where qr_hash IN (${qrCodeHashes:csv}) AND claimed = false', {
    qrCodeHashes,
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

export async function getQrByUserInput(user_input: string, minted?: boolean): Promise<ClaimQR[]> {
  let query = 'SELECT * FROM qr_claims WHERE user_input = ${user_input}';
  if(minted !== undefined) {
    if(minted) {
      query = query + " AND tx_hash IS NOT NULL ''"
    } else {
      query = query + " AND tx_hash IS NULL"
    }
  }
  const res = await db.manyOrNone<ClaimQR>(query, {
    user_input
  });
  return res;
}

export async function getNonMintedQrByUserInput(user_input: string): Promise<ClaimQR[]> {
  const res = await db.manyOrNone<ClaimQR>('SELECT * FROM qr_claims WHERE user_input = ${user_input} AND tx_hash', {
    user_input
  });
  return res;
}

export async function getQrRoll(qrRollId: string): Promise<null | eventHost> {
  const res = await db.oneOrNone<eventHost>('SELECT * FROM qr_roll WHERE id=${qrRollId} AND is_active = true', { qrRollId });
  return res;
}

export async function getPaginatedQrClaims(limit: number, offset: number, eventId: number, qrRollId: number, claimed: string | null, scanned: string | null): Promise<ClaimQR[]> {
  let query = `SELECT q.id, q.qr_hash, q.tx_hash, q.event_id, q.beneficiary,
  q.claimed, q.scanned, tx.status as tx_status, q.delegated_mint, q.user_input
  FROM qr_claims q LEFT JOIN server_transactions tx on q.tx_hash = tx.tx_hash
  WHERE q.is_active = true `

  if (eventId) {
    query = query + `AND q.event_id = ${eventId} `
  }

  if (qrRollId) {
    query = query + `AND q.qr_roll_id = ${qrRollId} `
  }

  if (claimed && ['true', 'false'].indexOf(claimed) > -1) {
    query = query + 'AND q.claimed = ' + claimed + ' '
  }

  if (scanned && ['true', 'false'].indexOf(scanned) > -1) {
    query = query + 'AND q.scanned = ' + scanned + ' '
  }

  query = query + 'ORDER BY q.created_date DESC, q.id DESC LIMIT ${limit} OFFSET ${offset}';

  const res = await db.manyOrNone<ClaimQR>(query, { limit, offset });
  return res
}

export async function getTotalQrClaims(eventId: number, qrRollId: number, claimed: string | null, scanned: string | null): Promise<number> {
  let query = 'SELECT * FROM qr_claims WHERE is_active = true '

  if (eventId) {
    query = query + `AND event_id = ${eventId} `
  }

  if (qrRollId) {
    query = query + `AND qr_roll_id = ${qrRollId} `
  }

  if (claimed && ['true', 'false'].indexOf(claimed) > -1) {
    query = query + 'AND claimed = ' + claimed + ' '
  }

  if (scanned && ['true', 'false'].indexOf(scanned) > -1) {
    query = query + 'AND scanned = ' + scanned + ' '
  }

  query = query + 'ORDER BY created_date DESC'

  const res = await db.result(query);
  return res.rowCount;
}

export async function getEventTemplate(id: string | number): Promise<null | EventTemplate> {
  const res = await db.oneOrNone<EventTemplate>('SELECT ' + publicTemplateColumns + ' FROM event_templates WHERE id=${id} AND is_active = true', { id });
  return res;
}

export async function getEventTemplatesByName(name: string): Promise<EventTemplate[]> {
  const res = await db.manyOrNone<EventTemplate>('SELECT ' + publicTemplateColumns + ' FROM event_templates WHERE name ILIKE ${name} AND is_active = true', { name });
  return res;
}

export async function getPaginatedEventTemplates(limit: number, offset: number, name: string|null): Promise<EventTemplate[]> {
  let query = `SELECT * FROM event_templates WHERE is_active = true `

  if (name) {
    query = query + `AND name ILIKE '%${name}%' `;
  }

  query = query + 'ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}';

  const res = await db.manyOrNone<EventTemplate>(query, { limit, offset });
  return res
}

export async function getTotalEventTemplates(name: string): Promise<number> {
  let query = `SELECT * FROM event_templates WHERE is_active = true `

  if (name) {
    query = query + `AND name ILIKE '%${name}%' `;
  }
  const res = await db.result(query);
  return res.rowCount;
}

export async function createEventTemplate(event_template: Omit<FullEventTemplate, 'id'>): Promise<FullEventTemplate> {
  const data = await db.one(
      'INSERT INTO event_templates(${this:name}) VALUES(${this:csv}) RETURNING id',
      event_template
  );

  return {
    ...event_template,
    id: data.id as number,
  };
}

export async function getFullEventTemplateById(id: string): Promise<null | FullEventTemplate> {
  let query = 'SELECT * FROM event_templates WHERE id = ${id}'
  const res = await db.oneOrNone<FullEventTemplate>(query, {id});
  return res;
}

export async function updateEventTemplate(
    id: string,
    changes: Pick<FullEventTemplate, 'name' | 'title_link' | 'header_link_text' | 'header_link_url' | 'header_color' | 'header_link_color' | 'main_color' | 'footer_color' | 'left_image_link' | 'right_image_link' | 'mobile_image_link' | 'title_image' | 'right_image_url' | 'left_image_url' | 'mobile_image_url' | 'footer_icon' | 'secret_code'>
): Promise<boolean> {
  const res = await db.result(
      'UPDATE event_templates SET ' +
      'name=${name}, ' +
      'title_link=${title_link}, ' +
      'header_link_text=${header_link_text}, ' +
      'header_link_url=${header_link_url}, ' +
      'header_color=${header_color}, ' +
      'header_link_color=${header_link_color}, ' +
      'main_color=${main_color}, ' +
      'footer_color=${footer_color}, ' +
      'left_image_link=${left_image_link}, ' +
      'right_image_link=${right_image_link}, ' +
      'mobile_image_link=${mobile_image_link}, ' +
      'title_image=${title_image}, ' +
      'right_image_url=${right_image_url}, ' +
      'left_image_url=${left_image_url}, ' +
      'mobile_image_url=${mobile_image_url}, ' +
      'footer_icon=${footer_icon}, ' +
      'secret_code=${secret_code}' +
      'WHERE id = ${id}',
      {
        id,
        ...changes,
      }
  );
  return res.rowCount === 1;
}

export async function saveEventTemplateUpdate(eventTemplateId: number, field: string, newValue: string, oldValue: string, isAdmin: boolean): Promise<boolean> {
  let query = 'INSERT INTO event_templates_history (event_template_id, field, old_value, new_value, from_admin) ' +
      'VALUES (${eventTemplateId}, ${field}, ${oldValue}, ${newValue}, ${isAdmin}) RETURNING id'

  await db.one(query, {eventTemplateId, field, oldValue, newValue, isAdmin})
  return true
}

export async function getActiveEmailClaims(email?: string, token?: string): Promise<EmailClaim[]> {
  const now = new Date();
  let query = 'SELECT * FROM email_claims WHERE processed = false AND end_date >= ${now}'
  if(email) {
    query = query + ' AND email = ${email}'
  }
  if(token) {
    query = query + ' AND token = ${token}'
  }

  return db.manyOrNone<EmailClaim>(
    query,
    { email, token, now }
  );
}

export async function saveEmailClaim(email: string, end_date: Date): Promise<{token: string}> {
  let query = 'INSERT INTO email_claims (email, end_date) VALUES (${email}, ${end_date}) RETURNING token'
  return db.one(query, { email, end_date });
}

export async function deleteEmailClaim(email: string, end_date: Date) {
  let query = 'DELETE FROM email_claims WHERE email = ${email} AND end_date = ${end_date}'
  await db.result(query, { email, end_date });
}

export async function updateProcessedEmailClaim(email: string, token: string): Promise<boolean> {
  let query = 'UPDATE email_claims SET processed = true WHERE email = ${email} AND token = ${token} AND processed = false'
  const res = await db.result(query, { email, token });
  return res.rowCount === 1;

}
