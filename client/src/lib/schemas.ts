import * as yup from 'yup';
import { utils } from 'ethers';

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
    .test('is-signer-an-address', 'Must be a valid Ethereum Address', signer => {
      if (!signer) return true;
      return utils.isHexString(signer, 20);
    })
    .nullable(),
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
