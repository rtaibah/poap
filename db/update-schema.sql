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
  "qr_roll_id" integer,
  "numeric_id" integer,
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
    "status" varchar(100) constraint default_status DEFAULT 'PENDING',
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
);

CREATE TABLE qr_roll (
    "id" SERIAL PRIMARY KEY,
    "event_host_id" integer,
    "is_active" boolean default true
);

alter table qr_claims alter column event_id drop not null;


ALTER TABLE events ADD COLUMN event_host_id INTEGER NULL;

ALTER TABLE qr_claims
ADD COLUMN qr_roll_id INTEGER NULL,
ADD COLUMN numeric_id INTEGER NULL;

ALTER TABLE qr_claims ADD COLUMN scanned BOOLEAN DEFAULT false;

create unique index qr_claims_numeric_id_uindex
	on qr_claims (numeric_id);

alter table event_host
	add passphrase varchar(256);

create unique index event_host_passphrase_uindex_2
	on event_host (passphrase);

ALTER TABLE qr_claims
	ADD delegated_mint BOOLEAN DEFAULT false,
	ADD delegated_signed_message VARCHAR(256);

ALTER TABLE server_transactions
    ALTER COLUMN arguments TYPE VARCHAR(2000);

ALTER TABLE events ADD virtual_event BOOLEAN DEFAULT false;
ALTER TABLE qr_claims ADD user_input VARCHAR(256);

ALTER TABLE events ADD secret_code INTEGER;
UPDATE events SET secret_code = floor(100000 + random() * 899999);

CREATE TABLE events_history (
    "id" SERIAL PRIMARY KEY,
    "event_id" INTEGER NOT NULL REFERENCES events (id),
    "field" VARCHAR(100) NOT NULL,
    "old_value" VARCHAR,
    "new_value" VARCHAR,
    "from_admin" BOOLEAN DEFAULT FALSE,
    "created_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE event_templates (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(256),
    "title_image" varchar(256),
    "title_link" varchar(256),
    "header_link_text" varchar(256),
    "header_link_url" varchar(256),
    "header_color" varchar(256),
    "header_link_color" varchar(256),
    "main_color" varchar(256),
    "footer_color" varchar(256),
    "left_image_url" varchar(256),
    "left_image_link" varchar(256),
    "right_image_url" varchar(256),
    "right_image_link" varchar(256),
    "mobile_image_url" varchar(256),
    "mobile_image_link" varchar(256),
    "footer_icon" varchar(256),
    "secret_code" integer,
    "created_date" timestamp with time zone not null default now(),
    "is_active" boolean default true
);

CREATE TABLE event_templates_history (
    "id" SERIAL PRIMARY KEY,
    "event_template_id" INTEGER NOT NULL REFERENCES events (id),
    "field" VARCHAR(100) NOT NULL,
    "old_value" VARCHAR,
    "new_value" VARCHAR,
    "from_admin" BOOLEAN DEFAULT FALSE,
    "created_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN event_template_id INTEGER NULL REFERENCES event_templates (id);

UPDATE event_templates SET secret_code = floor(100000 + random() * 899999);

ALTER TABLE signers ADD COLUMN layer VARCHAR(50);
ALTER TABLE signers ADD CONSTRAINT chk_layer CHECK (layer IN ('Layer1', 'Layer2'));
UPDATE signers SET layer = 'Layer1' WHERE id IS NOT NULL;

ALTER TABLE server_transactions ADD COLUMN layer VARCHAR(50);
ALTER TABLE server_transactions ADD CONSTRAINT chk_layer CHECK (layer IN ('Layer1', 'Layer2'));
UPDATE server_transactions SET layer = 'Layer1' WHERE id IS NOT NULL;
ALTER TABLE signers DROP CONSTRAINT signers_signer_key;

ALTER TABLE server_transactions ADD COLUMN result json;

CREATE TABLE email_claims (
    "id" SERIAL PRIMARY KEY,
    "email" varchar(256),
    "token" uuid default gen_random_uuid() not null unique,
    "end_date" timestamp with time zone,
    "processed" boolean default false
);

ALTER TABLE qr_claims DROP CONSTRAINT qr_claims_tx_hash_key;
