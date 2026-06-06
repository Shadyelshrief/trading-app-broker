import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const pricePrecisionValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  return /^\d{1,10}(\.\d{1,3})?$/.test(`${value}`) ? null : { pricePrecision: true };
};

export const orderEntryValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const orderType = control.get('orderType')?.value;
  const goodTill = control.get('goodTill')?.value;
  const fillTerm = control.get('fillTerm')?.value;
  const quantity = toNumber(control.get('quantity')?.value);
  const orderPrice = toNumber(control.get('orderPrice')?.value);
  const tradeAmount = toNumber(control.get('tradeAmount')?.value);
  const minQuantity = toNumber(control.get('minQuantity')?.value);
  const disclosedVolume = toNumber(control.get('disclosedVolume')?.value);
  const expiryDate = control.get('expiryDate')?.value;
  const errors: ValidationErrors = {};

  if ((orderType === 'LIMIT' || orderType === 'MARKET') && (!quantity || quantity <= 0)) {
    errors['quantityRequired'] = true;
  }

  if (orderType === 'LIMIT' && (!orderPrice || orderPrice <= 0)) {
    errors['priceRequired'] = true;
  }

  if ((orderType === 'TAKE' || orderType === 'HIT') && (!tradeAmount || tradeAmount <= 0)) {
    errors['tradeAmountRequired'] = true;
  }

  if ((fillTerm === 'MF' || fillTerm === 'MB') && minQuantity !== undefined && quantity !== undefined && minQuantity > quantity) {
    errors['minQuantityExceedsQuantity'] = true;
  }

  if (disclosedVolume !== undefined && quantity !== undefined && disclosedVolume >= quantity) {
    errors['disclosedVolumeExceedsQuantity'] = true;
  }

  if (goodTill === 'GTD' && !expiryDate) {
    errors['expiryDateRequired'] = true;
  }

  return Object.keys(errors).length ? errors : null;
};

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
