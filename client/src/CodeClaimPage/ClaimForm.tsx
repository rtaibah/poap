import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { ErrorMessage, Field, FieldProps, Form, Formik, FormikActions } from 'formik';
import { FiCheckSquare, FiSquare, FiHelpCircle } from 'react-icons/fi';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Portis from '@portis/web3';
// @ts-ignore
import { TransactionReceipt } from 'web3-core';
import { useToasts } from 'react-toast-notifications';
import { Tooltip } from 'react-lightweight-tooltip';

/* Helpers */
import { tryGetAccount } from 'poap-eth';
import { HashClaim, postClaimHash, getClaimHash, postTokenMigration, Template, TemplatePageFormValues } from 'api';
import { AddressSchema } from 'lib/schemas';
import { hasWeb3 } from 'poap-eth';

/* Components */
import { TxDetail } from '../components/TxDetail';
import { SubmitButton } from 'components/SubmitButton';
import ClaimFooterMessage from './ClaimFooterMessage';

/* Lib */
import { COLORS, STYLES, TX_STATUS } from 'lib/constants';
import { useImageSrc } from 'lib/hooks/useImageSrc';

/* ABI */
import abi from '../abis/PoapDelegatedMint.json';

type QRFormValues = {
  address: string;
};

const NETWORK = process.env.REACT_APP_ETH_NETWORK;
const CONTRACT_ADDRESS = process.env.REACT_APP_MINT_DELEGATE_CONTRACT;

const ClaimForm: React.FC<{
  claim?: HashClaim;
  template?: Template | TemplatePageFormValues;
  onSubmit: (claim: HashClaim) => void;
}> = ({ claim, onSubmit, template }) => {
  const [claimed, setClaimed] = useState<boolean>(false);
  const [enabledWeb3, setEnabledWeb3] = useState<boolean | null>(null);
  const [account, setAccount] = useState<string>('');
  const [migrateInProcess, setMigrateInProcess] = useState<boolean>(false);
  const [migrate, setMigrate] = useState<boolean>(false);
  const [token, setToken] = useState<number | null>(null);
  const [web3, setWeb3] = useState<any>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [completeClaim, setCompleteClaim] = useState<HashClaim | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [txReceipt, setTxReceipt] = useState<null | TransactionReceipt>(null);

  const mobileImageUrlRaw = claim?.event_template?.mobile_image_url ?? template?.mobile_image_url;
  const mobileImageLink = claim?.event_template?.mobile_image_link ?? template?.mobile_image_link;
  const mainColor = claim?.event_template?.main_color ?? template?.main_color;

  const mobileImageUrl = useImageSrc(mobileImageUrlRaw);

  const { addToast } = useToasts();

  useEffect(() => {
    hasWeb3().then(setEnabledWeb3);
  }, []);

  useEffect(() => {
    if (migrateInProcess && !token) {
      const interval = setInterval(fetchClaim, 2000);
      return () => clearInterval(interval);
    }
  }, [migrateInProcess, token]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    startMigration();
  }, [token]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (txHash && web3) {
      const interval = setInterval(() => {
        getReceipt();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [txHash, txReceipt]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const getAddress = () => {
    tryGetAccount()
      .then((address) => {
        if (address) setAccount(address);
      })
      .catch((e) => {
        console.log('Error while fetching account: ', e);
      });
  };

  const connectWallet = async () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID,
        },
      },
      portis: {
        package: Portis,
        options: {
          id: process.env.REACT_APP_PORTIS_APP_ID,
        },
      },
    };

    const web3Modal = new Web3Modal({
      network: NETWORK,
      cacheProvider: false,
      providerOptions,
    });

    try {
      const provider = await web3Modal.connect();
      const _web3: any = new Web3(provider);

      const _network = await _web3.eth.net.getNetworkType();
      setNetwork(_network);

      return _web3;
    } catch (e) {
      return null;
    }
  };

  const startMigration = () => {
    if (token) {
      postTokenMigration(token)
        .then((result) => {
          if (result) {
            migrateToken(result.signature);
          }
        })
        .catch(showErrorMessage);
    }
  };

  const migrateToken = async (signature: string) => {
    let _web3 = web3;
    if (!_web3) {
      _web3 = await connectWallet();
      if (!_web3) return null;

      setWeb3(_web3);
    }

    const accounts = await _web3.eth.getAccounts();
    if (accounts.length === 0) return null;

    const account = accounts[0];

    if (NETWORK && network && NETWORK.indexOf(network) === -1) {
      let message = `Wrong network, please connect to ${NETWORK}.\nCurrently on ${network}`;
      addToast(message, {
        appearance: 'error',
        autoDismiss: false,
      });
      return null;
    }

    if (!completeClaim) return;
    const { event, beneficiary } = completeClaim;

    try {
      const contract = new _web3.eth.Contract(abi, CONTRACT_ADDRESS);
      let gas = 1000000;
      try {
        gas = await contract.methods.mintToken(event.id, token, beneficiary, signature).estimateGas({ from: account });
        gas = Math.floor(gas * 1.3);
      } catch (e) {
        console.log('Error calculating gas');
      }

      contract.methods
        .mintToken(event.id, token, beneficiary, signature)
        .send({ from: account, gas: gas }, (err: any, hash: string | null) => {
          if (err) {
            console.log('Error on Mint Token: ', err);
            showErrorMessage();
          }
          if (hash) {
            setTxHash(hash);
          }
        });
    } catch (e) {
      console.log('Error submitting transaction');
      console.log(e);
      showErrorMessage();
    }
  };

  const getReceipt = async () => {
    let receipt: null | TransactionReceipt = null;
    if (web3 && txHash !== '' && !txReceipt) {
      receipt = await web3.eth.getTransactionReceipt(txHash);
      if (receipt) {
        setTimeout(() => setTxReceipt(receipt), 1000);
      }
    }

    if (!receipt || !receipt.status || (txReceipt && !txReceipt.status)) {
      setMigrateInProcess(false);
    }

    if (receipt && receipt.status && completeClaim) onSubmit(completeClaim);
  };

  const toggleCheckbox = () => setMigrate(!migrate);

  const handleFormSubmit = async (values: QRFormValues, actions: FormikActions<QRFormValues>) => {
    if (claimed) {
      startMigration();
      return;
    }
    try {
      actions.setSubmitting(true);
      if (claim) {
        const newClaim = await postClaimHash(claim.qr_hash.toLowerCase(), values.address.toLowerCase(), claim.secret);
        setClaimed(true);
        if (migrate) {
          setMigrateInProcess(true);
          setCompleteClaim(newClaim);
          actions.setSubmitting(false);
        } else {
          onSubmit(newClaim);
        }
      }
    } catch (error) {
      actions.setStatus({
        ok: false,
        msg: `Badge couldn't be claimed: ${error.message}`,
      });
      actions.setSubmitting(false);
    }
  };

  const fetchClaim = async () => {
    if (!claim) return;
    getClaimHash(claim.qr_hash.toLowerCase()).then((claim) => {
      setCompleteClaim(claim);
      if (claim && claim.tx_status === TX_STATUS.passed && claim.result && claim.result.token) {
        setToken(claim.result.token);
      }
    });
  };

  const showErrorMessage = () => {
    setMigrateInProcess(false);
    let message = `Error while trying to submit transaction.\nPlease try again.`;
    addToast(message, {
      appearance: 'error',
      autoDismiss: false,
    });
  };

  let CheckboxIcon = !migrate ? FiCheckSquare : FiSquare;

  const migrationText = (
    <div className={'backoffice-tooltip'}>
      All POAPs are minted in xDAI, but should you want your POAP in mainnet, un-check this checkbox so that you can
      submit the transaction to migrate the badge to mainnet. You'll need to pay for the transaction cost.
    </div>
  );

  return (
    <div className={'container claim-info'} data-aos="fade-up" data-aos-delay="300">
      <div>
        <Formik
          enableReinitialize
          onSubmit={handleFormSubmit}
          initialValues={{ address: account }}
          isInitialValid={account !== ''}
          validationSchema={AddressSchema}
        >
          {({ isValid, isSubmitting, status }) => {
            return (
              <Form className="claim-form">
                <Field
                  name="address"
                  render={({ field, form }: FieldProps) => {
                    return (
                      <input
                        type="text"
                        autoComplete="off"
                        style={{ borderColor: mainColor ?? COLORS.primaryColor }}
                        className={classNames(!!form.errors[field.name] && 'error')}
                        placeholder={'Input your Ethereum address or ENS name or email'}
                        {...field}
                        disabled={claimed}
                      />
                    );
                  }}
                />
                <ErrorMessage name="gasPrice" component="p" className="bk-error" />
                {status && <p className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</p>}
                <div
                  className={'layer-checkbox'}
                  onClick={!isSubmitting && !migrateInProcess && !claimed ? toggleCheckbox : () => {}}
                >
                  <CheckboxIcon color={mainColor ?? COLORS.primaryColor} /> Free minting in xDAI{' '}
                  <Tooltip content={[migrationText]}>
                    <FiHelpCircle color={mainColor ?? COLORS.primaryColor} />
                  </Tooltip>
                </div>
                {!txHash && (
                  <>
                    <div className={'web3-browser'}>
                      {enabledWeb3 && (
                        <div>
                          Web3 browser? <span onClick={getAddress}>Get my address</span>
                        </div>
                      )}
                    </div>
                    <SubmitButton
                      text="Claim POAP token"
                      style={{
                        backgroundColor: mainColor ?? COLORS.primaryColor,
                        boxShadow: mainColor ? STYLES.boxShadow(mainColor) : '',
                      }}
                      isSubmitting={isSubmitting || migrateInProcess}
                      canSubmit={isValid}
                    />
                  </>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>

      {txHash && <TxDetail hash={txHash} receipt={txReceipt} />}

      {txReceipt && !txReceipt.status && (
        <div className={'text-info'}>
          <p>It seems that your transaction failed. Please refresh the page</p>
        </div>
      )}

      <ClaimFooterMessage linkStyle={{ color: mainColor ?? COLORS.primaryColor }} />
      <div className="mobile-image">
        {mobileImageUrl ? (
          mobileImageLink ? (
            <a href={mobileImageLink} rel="noopener noreferrer" target="_blank">
              <img alt="Brand publicity" src={mobileImageUrl} />
            </a>
          ) : (
            <img alt="Brand publicity" src={mobileImageUrl} />
          )
        ) : null}
      </div>
    </div>
  );
};

export default ClaimForm;
