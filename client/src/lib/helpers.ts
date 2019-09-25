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
  return Number(formatUnits(numberInWEI, 'gwei')).toString();
};

const convertFromGWEI = (numberInGWEI: string) => {
  let numberGWEI: number = Number(numberInGWEI);
  for (let i = 1; i < 10; i ++){
    numberGWEI = Number(numberGWEI) * 10;
  }
  return String(numberGWEI);
};

const reduceAddress = (address: string) => {
  if (address.length < 10) return address
  return address.slice(0, 6) + '\u2026' + address.slice(-4)
};

export { isValidAddress, convertToGWEI, convertFromGWEI, reduceAddress };
