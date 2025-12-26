/**
 * Utility for currency mapping and formatting based on country codes.
 */

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    'US': 'USD',
    'IN': 'INR',
    'GB': 'GBP',
    'CA': 'CAD',
    'AU': 'AUD',
};

export const COUNTRY_SYMBOL_MAP: Record<string, string> = {
    'US': '$',
    'IN': '₹',
    'GB': '£',
    'CA': '$',
    'AU': '$',
};

/**
 * Formats a number as a localized currency string.
 * @param amount The numerical value to format.
 * @param countryCode The ISO 3166-1 alpha-2 country code (e.g., 'US', 'IN').
 */
export const formatCurrency = (amount: number, countryCode: string = 'US'): string => {
    const currency = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';

    // Map country code to preferred locale for numbering style
    const localeMap: Record<string, string> = {
        'IN': 'en-IN',
        'US': 'en-US',
        'GB': 'en-GB',
        'CA': 'en-CA',
        'AU': 'en-AU',
    };

    const locale = localeMap[countryCode] || 'en-US';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Gets the currency symbol for a country code.
 */
export const getCurrencySymbol = (countryCode: string = 'US'): string => {
    return COUNTRY_SYMBOL_MAP[countryCode] || '$';
};
