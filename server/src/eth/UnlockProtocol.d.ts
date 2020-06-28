import { Contract, ContractTransaction, EventFilter } from "ethers";
import { Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import { TransactionOverrides } from ".";
import { Address } from "../types";

export class UnlockProtocol extends Contract {
  functions: {
    getHasValidKey(_owner: Address): Promise<boolean>;
  }
}