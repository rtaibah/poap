import { getAddress, formatUnits } from 'ethers/utils';

function isValidAddress(str: string): boolean {
  try {
    getAddress(str);
    return true;
  } catch (error) {
    return false;
  }
}

const convertToGWEI = (numberInWEI: string) => {
  return Math.trunc(Number(formatUnits(numberInWEI, 'gwei'))).toString();
};

const convertFromGWEI = (numberInGWEI: string) => {
  return String(Number(numberInGWEI) * 1000000000);
};

export { isValidAddress, convertToGWEI, convertFromGWEI };
