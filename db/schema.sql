CREATE TABLE events (
  "id" SERIAL PRIMARY KEY,
  "fancy_id" varchar(256) UNIQUE not null,
  "signer_ip" varchar,
  "signer" varchar,
  "name" varchar(256) not null,
  "event_url" varchar,
  "image_url" varchar,
  "country" varchar(256),
  "city" varchar(256),
  "description" varchar,
  "year" smallint not null,
  "start_date" date not null,
  "end_date" date not null,
  "created_date" timestamp with time zone not null default now()
);

CREATE TABLE signers (
  "id" SERIAL PRIMARY KEY,
  "signer" varchar(256) UNIQUE not null,
  "role" varchar(100) not null,
  "gas_price" varchar(1000) not null,
  "created_date" timestamp with time zone not null default now()
);

CREATE TABLE poap_settings (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(256) UNIQUE not null,
  "type" varchar not null,
  "value" varchar(1000) not null,
  "created_date" timestamp with time zone not null default now()
);

CREATE TABLE server_transactions (
  "id" SERIAL PRIMARY KEY,
  "tx_hash" varchar(256) UNIQUE not null,
  "nonce" smallint not null,
  "signer" varchar(256) not null,
  "operation" varchar(100) not null,
  "arguments" varchar(1000) not null,
  "status" varchar(100) not null default 'pending',
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