/* CREATE TABLE server_transactions */
CREATE TABLE server_transactions (
  "id" SERIAL PRIMARY KEY,
  "tx_hash" varchar(256) UNIQUE not null,
  "nonce" smallint not null,
  "operation" varchar(100) not null,
  "arguments" varchar(1000) not null,
  "created_date" timestamp with time zone not null default now()
);

/* ALTER TABLE server_transactions with new fields */
ALTER TABLE server_transactions 
    ADD COLUMN signer VARCHAR (256) NOT NULL,
    ADD COLUMN status VARCHAR (100) NOT NULL default 'pending',
    ADD COLUMN gas_price VARCHAR (1000) NOT NULL;

/* CREATE TABLE signers */

CREATE TABLE signers (
  "id" SERIAL PRIMARY KEY,
  "signer" varchar(256) UNIQUE not null,
  "role" varchar(100) not null,
  "gas_price" varchar(1000) not null,
  "created_date" timestamp with time zone not null default now()
);

/* CREATE TABLE qr_claims */
CREATE TABLE qr_claims (
  "id" SERIAL PRIMARY KEY,
  "qr_hash" varchar(256) UNIQUE not null,
  "tx_hash" varchar(256) UNIQUE,
  "event_id" integer not null,
  "beneficiary" varchar(256),
  "signer" varchar(256),
  "claimed" boolean default false,
  "claimed_date" timestamp with time zone,
  "created_date" timestamp with time zone not null default now(),
  "is_active" boolean default true
);

CREATE EXTENSION pgcrypto;

/* CREATE TABLE task_creators */
CREATE TABLE task_creators (
  "id" SERIAL PRIMARY KEY,
  "api_key" uuid default gen_random_uuid() not null,
  "valid_from" timestamp not null,
  "valid_to" timestamp not null,
  "description" varchar(256),
  "task_name" varchar(256)
);

/* CREATE TABLE task */
CREATE TABLE task (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(100),
    "task_data" json,
    "status" varchar(100) constraint default_satus DEFAULT 'PENDING',
    "return_data" varchar(256),
    CONSTRAINT chk_status CHECK (status IN ('FINISH', 'FINISH_WITH_ERROR', 'IN_PROCESS', 'PENDING'))
);

/* CREATE TABLE notifications */
CREATE TABLE notifications (
    "id" SERIAL PRIMARY KEY,
    "title" varchar(256),
    "description" varchar(256),
    "type" varchar(100) constraint default_type DEFAULT 'inbox',
    "event_id" integer,
    "created_date" timestamp with time zone not null default now()
    CONSTRAINT chk_type CHECK (type IN ('inbox', 'push'))
);
