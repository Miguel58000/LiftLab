export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function kmToMi(km: number): number {
  return km * 0.621371;
}

export function miToKm(mi: number): number {
  return mi / 0.621371;
}

/**
 * Formats a weight value based on the user's preferred unit.
 * Input is ALWAYS in kg.
 */
export function formatWeight(kg: number, unit: 'kg' | 'lbs', showUnit: boolean = true, decimals: number = 1): string {
  if (kg === 0) return showUnit ? `0 ${unit}` : '0';
  
  const val = unit === 'lbs' ? kgToLbs(kg) : kg;
  // If it's a whole number, don't show decimals
  const isWhole = val % 1 === 0 || Math.abs((val % 1) - 1) < 0.01;
  const formattedVal = isWhole ? Math.round(val).toString() : val.toFixed(decimals);
  
  return showUnit ? `${formattedVal} ${unit}` : formattedVal;
}

/**
 * Returns the numeric value of weight in the preferred unit.
 * Input is ALWAYS in kg.
 */
export function getWeightInUnit(kg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? kgToLbs(kg) : kg;
}

/**
 * Formats a distance value based on the user's preferred unit.
 * Input is ALWAYS in km.
 */
export function formatDistance(km: number, unit: 'km' | 'mi', showUnit: boolean = true, decimals: number = 2): string {
  if (km === 0) return showUnit ? `0 ${unit}` : '0';

  const val = unit === 'mi' ? kmToMi(km) : km;
  const isWhole = val % 1 === 0 || Math.abs((val % 1) - 1) < 0.01;
  const formattedVal = isWhole ? Math.round(val).toString() : val.toFixed(decimals);
  
  return showUnit ? `${formattedVal} ${unit}` : formattedVal;
}

/**
 * Returns the numeric value of distance in the preferred unit.
 * Input is ALWAYS in km.
 */
export function getDistanceInUnit(km: number, unit: 'km' | 'mi'): number {
  return unit === 'mi' ? kmToMi(km) : km;
}

/**
 * Converts a weight input from the preferred unit back to kg for storage.
 */
export function convertWeightInputToKg(val: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? lbsToKg(val) : val;
}

/**
 * Converts a distance input from the preferred unit back to km for storage.
 */
export function convertDistanceInputToKm(val: number, unit: 'km' | 'mi'): number {
  return unit === 'mi' ? miToKm(val) : val;
}

/**
 * Formats speed based on distance (km) and duration (seconds).
 */
export function formatSpeed(distKm: number, durationSecs: number, unit: 'km' | 'mi'): string {
  if (distKm === 0 || durationSecs === 0) return '0.0 ' + (unit === 'mi' ? 'mi/h' : 'km/h');
  
  const hours = durationSecs / 3600;
  const speedKmh = distKm / hours;
  const speed = unit === 'mi' ? kmToMi(speedKmh) : speedKmh;
  const speedUnit = unit === 'mi' ? 'mi/h' : 'km/h';
  
  return `${speed.toFixed(1)} ${speedUnit}`;
}
