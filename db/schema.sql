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
  "event_host_id" integer,
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
  "event_id" integer,
  "beneficiary" varchar(256),
  "signer" varchar(256),
  "claimed" boolean default false,
  "claimed_date" timestamp with time zone,
  "created_date" timestamp with time zone not null default now(),
  "qr_roll_id": integer,
  "numeric_id": integer,
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
CREATE TABLE tasks (
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

CREATE TABLE event_host (
    "id" SERIAL PRIMARY KEY,
    "user_id" varchar(256) UNIQUE,
    "is_active" boolean default true
)

CREATE TABLE qr_roll (
    "id" SERIAL PRIMARY KEY,
    "event_host_id" integer,
    "is_active" boolean default true
);
