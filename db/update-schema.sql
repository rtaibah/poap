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
