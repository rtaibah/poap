import * as yup from 'yup';
import { utils } from 'ethers';

import { IMAGE_SUPPORTED_FORMATS } from './constants';

const AddressSchema = yup.object().shape({
  address: yup.string().required(),
});

const GasPriceSchema = yup.object().shape({
  gasPrice: yup
    .number()
    .required()
    .positive(),
});

const BurnFormSchema = yup.object().shape({
  tokenId: yup
    .number()
    .required()
    .positive()
    .integer(),
});

const fileSchema = yup
  .mixed()
  .test('fileFormat', 'Unsupported format, try .jpg or .png', value =>
    IMAGE_SUPPORTED_FORMATS.includes(value.type)
  );

const PoapEventSchema = yup.object().shape({
  name: yup.string().required(),
  year: yup
    .number()
    .required()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  id: yup.number(),
  description: yup.string(),
  start_date: yup.date(),
  end_date: yup.date(),
  city: yup.string(),
  country: yup.string(),
  event_url: yup.string().url(),
  image: yup
    .mixed()
    .when('isFile', {
      is: value => value,
      then: fileSchema,
      otherwise: yup.string(),
    })
    .required(),
});

const IssueForEventFormValueSchema = yup.object().shape({
  eventId: yup
    .number()
    .required()
    .min(1),
  addressList: yup.string().required(),
  signer: yup
    .string()
    .required()
    .matches(/^0x[0-9a-fA-F]{40}$/, 'Not a valid address'),
});

const IssueForUserFormValueSchema = yup.object().shape({
  eventIds: yup
    .array()
    .of(yup.number().min(1))
    .required()
    .min(1),
  address: yup.string().required(),
  signer: yup
    .string()
    .required()
    .matches(/^0x[0-9a-fA-F]{40}$/, 'Not a valid address'),
});

const ClaimHashSchema = yup.object().shape({
  hash: yup
    .string()
    .required()
    .length(6),
});

const InboxFormSchema = yup.object().shape({
  title: yup.string().required(),
  description: yup.string().required(),
  recipientFilter: yup.string().required(),
  selectedEventId: yup.number().nullable(),
  notificationType: yup.string().required(),
});

export {
  AddressSchema,
  GasPriceSchema,
  BurnFormSchema,
  PoapEventSchema,
  ClaimHashSchema,
  IssueForEventFormValueSchema,
  IssueForUserFormValueSchema,
  InboxFormSchema,
};
