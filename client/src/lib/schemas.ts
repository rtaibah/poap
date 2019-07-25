import * as yup from 'yup';

import { ADDRESS_REGEXP } from './constants';

const GasPriceSchema = yup.object().shape({
  gasPrice: yup
    .number()
    .required()
    .positive()
    .integer(),
});

const BurnFormSchema = yup.object().shape({
  tokenId: yup
    .number()
    .required()
    .positive()
    .integer(),
});

const PoapEventSchema = yup.object().shape({
  year: yup
    .number()
    .required()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  start_date: yup
    .string()
    .matches(/[0-9]{4}-[0-9]{2}-[0-9]{2}/, 'Date must be expressed in YYYY-MM-DD Format'),
  end_date: yup
    .string()
    .matches(/[0-9]{4}-[0-9]{2}-[0-9]{2}/, 'Date must be expressed in YYYY-MM-DD Format'),
  image_url: yup
    .string()
    .label('Image Url')
    .required()
    .url(),
  event_url: yup
    .string()
    .label('Website')
    .url(),
  signer_ip: yup
    .string()
    .label('Signer Url')
    .url()
    .nullable(),
  signer: yup
    .string()
    .matches(ADDRESS_REGEXP, 'Must be a valid Ethereum Address')
    .nullable(),
});

const IssueForEventFormValueSchema = yup.object().shape({
  eventId: yup
    .number()
    .required()
    .min(1),
  addressList: yup
    .string()
    .required()
    .matches(/^0x[0-9a-fA-F]{40}(\n0x[0-9a-fA-F]{40})*\n*$/, 'Not a valid address or address list'),
});

const IssueForUserFormValueSchema = yup.object().shape({
  eventIds: yup
    .array()
    .of(yup.number().min(1))
    .required()
    .min(1),
  address: yup
    .string()
    .required()
    .matches(/^0x[0-9a-fA-F]{40}$/, 'Not a valid address'),
});

export {
  GasPriceSchema,
  BurnFormSchema,
  PoapEventSchema,
  IssueForEventFormValueSchema,
  IssueForUserFormValueSchema,
};
