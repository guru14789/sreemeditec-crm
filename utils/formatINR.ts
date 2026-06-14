/**
 * formatINR - Format a number as Indian Rupee currency string
 * Uses en-IN locale for Indian Numbering System (e.g., 12,34,567.89)
 */
export const formatINR = (
  amount: number,
  opts?: { decimals?: number; symbol?: boolean }
): string => {
  const decimals = opts?.decimals ?? 2;
  const showSymbol = opts?.symbol !== false;
  const formatted = (amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `₹${formatted}` : formatted;
};

export default formatINR;
