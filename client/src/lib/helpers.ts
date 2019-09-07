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

export { isValidAddress, convertToGWEI, convertFromGWEI };
