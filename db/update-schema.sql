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